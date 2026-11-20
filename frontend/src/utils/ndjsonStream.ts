interface OpcionesNdjsonStream<T> {
  signal?: AbortSignal;
  timeoutMs?: number;
  onItem: (item: T) => void;
}

/**
 * Consume una respuesta HTTP NDJSON linea por linea respetando AbortSignal y timeout.
 */
export async function leerNdjsonStream<T>(
  url: string,
  { signal, timeoutMs = 90_000, onItem }: OpcionesNdjsonStream<T>,
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("Tiempo de espera agotado")), timeoutMs);
  const propagarAbort = () => controller.abort(signal?.reason);

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeout);
      return;
    }
    signal.addEventListener("abort", propagarAbort, { once: true });
  }

  try {
    const response = await fetch(url, {
      credentials: "include",
      headers: { Accept: "application/x-ndjson" },
      signal: controller.signal,
    });
    if (!response.ok || !response.body) {
      throw new Error(`Error al consultar detalle (HTTP ${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let salto = buffer.indexOf("\n");
      while (salto !== -1) {
        const linea = buffer.slice(0, salto).trim();
        buffer = buffer.slice(salto + 1);
        if (linea) onItem(JSON.parse(linea) as T);
        salto = buffer.indexOf("\n");
      }
    }

    const restante = (buffer + decoder.decode()).trim();
    if (restante) onItem(JSON.parse(restante) as T);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", propagarAbort);
  }
}
