import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const UA_POR_DEFECTO =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function findChromePath(): string {
  const envPath = process.env.CHROME_BIN || process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  const paths = [
    ...[process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA]
      .filter((directory): directory is string => Boolean(directory))
      .map((directory) => path.join(directory, "Google", "Chrome", "Application", "chrome.exe")),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return "google-chrome";
}

export interface ChromeSession {
  evaluate: <T>(expression: string) => Promise<T>;
  close: () => void;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function conTimeout<T>(promesa: Promise<T>, ms: number, mensaje: () => string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(mensaje())), ms);
  });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(timer));
}

export async function startChromeSession(
  opts: { url?: string; esperaMs?: number; profileDir?: string } = {},
): Promise<ChromeSession> {
  if (typeof WebSocket === "undefined") {
    throw new Error("Se requiere Node.js 22 o superior (WebSocket global).");
  }

  // Perfil dedicado para el scraper: evita conflictos con un Chrome abierto del usuario
  // y a la vez conserva cookies y clearance de Cloudflare entre ejecuciones para evitar bloqueos.
  const perfil =
    opts.profileDir ||
    process.env.CHROME_USER_DATA_DIR ||
    path.join(os.tmpdir(), "cinepolis-chrome-scraper-profile");
  fs.mkdirSync(perfil, { recursive: true });
  const args = [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${perfil}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--disable-blink-features=AutomationControlled",
    `--user-agent=${process.env.CHROME_UA || UA_POR_DEFECTO}`,
  ];
  // Necesario en Linux como root o en contenedores (Docker). Activar con CHROME_NO_SANDBOX=1.
  if (process.env.CHROME_NO_SANDBOX === "1") args.push("--no-sandbox");

  const chrome = spawn(findChromePath(), args, { stdio: ["ignore", "ignore", "pipe"] });
  let socket: WebSocket | undefined;

  const cerrar = () => {
    try {
      socket?.close();
    } catch {}
    try {
      chrome.kill();
    } catch {}
  };

  try {
    let stderr = "";
    const puerto = await conTimeout(
      new Promise<string>((resolve, reject) => {
        chrome.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();
          const m = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
          if (m) resolve(m[1]);
        });
        chrome.on("error", reject);
        chrome.on("exit", (code) => reject(new Error(`Chrome terminó con código ${code}.`)));
      }),
      15000,
      () => `Timeout iniciando Chrome. Stderr: ${stderr.slice(-800)}`,
    );

    const respuesta = await fetch(`http://127.0.0.1:${puerto}/json/new`, { method: "PUT" });
    const tab = (await respuesta.json()) as { webSocketDebuggerUrl: string };

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    socket = ws;
    await conTimeout(
      new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error("No se pudo conectar al WebSocket de Chrome."));
      }),
      10000,
      () => "Timeout conectando al WebSocket de Chrome.",
    );

    let nextId = 1;
    const pendientes = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

    ws.onmessage = (evt) => {
      const msg = JSON.parse(String(evt.data));
      const p = typeof msg.id === "number" ? pendientes.get(msg.id) : undefined;
      if (!p) return;
      pendientes.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
    };
    ws.onclose = () => {
      for (const p of pendientes.values()) p.reject(new Error("Conexión CDP cerrada."));
      pendientes.clear();
    };

    const send = (method: string, params: Record<string, unknown> = {}, timeoutMs = 30000): Promise<any> => {
      const id = nextId++;
      const promesa = new Promise<any>((resolve, reject) => {
        pendientes.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
      return conTimeout(promesa, timeoutMs, () => `Timeout en CDP ${method}`);
    };

    await send("Page.enable");
    await send("Runtime.enable");
    const nav = await send("Page.navigate", { url: opts.url ?? "https://cinepolis.com/cl" });
    if (nav.errorText) throw new Error(`Navegación fallida: ${nav.errorText}`);

    // Esperar a que la página del sitio cargue, en vez de un sleep fijo.
    const limite = Date.now() + (opts.esperaMs ?? 20000);
    while (Date.now() < limite) {
      const r = await send("Runtime.evaluate", {
        expression: `document.readyState === "complete" && location.hostname.endsWith("cinepolis.com") && !document.title.includes("Attention Required")`,
        returnByValue: true,
      });
      if (r.result?.value === true) break;
      await sleep(250);
    }
    await sleep(3000); // margen para hidratación y cookies

    return {
      evaluate: async <T>(expression: string): Promise<T> => {
        const response = await send(
          "Runtime.evaluate",
          { expression, awaitPromise: true, returnByValue: true },
          300000,
        );
        if (response.exceptionDetails) {
          const desc = response.exceptionDetails.exception?.description || response.exceptionDetails.text;
          throw new Error(`Error en browser evaluate: ${desc}`);
        }
        return response.result?.value as T;
      },
      close: cerrar,
    };
  } catch (err) {
    cerrar();
    throw err;
  }
}
