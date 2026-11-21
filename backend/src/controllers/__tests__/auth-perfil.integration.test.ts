import bcrypt from "bcrypt";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
    api,
    cookiesDe,
    detenerApi,
    iniciarApi,
    jsonRequest,
    peticionAutenticada,
    registrarUsuario,
} from "../../__tests__/helpers/api.ts";
import {
    crearCine,
    crearPelicula,
    limpiarBaseDeDatos,
} from "../../__tests__/helpers/database.ts";
import { query } from "../../db.ts";

describe("Autenticacion y perfil (integracion con PostgreSQL)", () => {
    beforeAll(async () => {
        await iniciarApi();
    });

    afterAll(async () => {
        await detenerApi();
    });

    beforeEach(async () => {
        await limpiarBaseDeDatos();
    });

    it("registra un usuario, normaliza sus datos y persiste el hash de la contrasena", async () => {
        const { respuesta, sesion } = await registrarUsuario({
            nombre: "  Ana  ",
            email: "  ANA@Test.CL ",
            contrasena: "secreto123",
        });

        expect(respuesta.status).toBe(201);
        expect(sesion.csrf).toMatch(/^[0-9a-f-]{36}$/);
        expect(respuesta.headers.get("set-cookie")).toContain("token=");
        expect(respuesta.headers.get("set-cookie")).toContain("HttpOnly");

        const cuerpo = await respuesta.json();
        expect(cuerpo).toMatchObject({
            nombre: "Ana",
            email: "ana@test.cl",
        });
        expect(cuerpo.id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
        expect(cuerpo.fechaRegistro).toBeDefined();
        expect(cuerpo.password_hash).toBeUndefined();

        const { rows } = await query(
            "SELECT email, password_hash, nombre FROM users WHERE id = $1;",
            [cuerpo.id],
        );
        expect(rows[0]!.email).toBe("ana@test.cl");
        expect(rows[0]!.password_hash).not.toBe("secreto123");
        expect(await bcrypt.compare("secreto123", rows[0]!.password_hash)).toBe(
            true,
        );
    });

    it("valida los campos del registro", async () => {
        const casos: Array<[unknown, string]> = [
            [{}, "Todos los campos son obligatorios"],
            [
                { nombre: "Ana", email: "ana@test.cl", contrasena: "12345" },
                "La contraseña debe tener al menos 6 caracteres",
            ],
            [
                { nombre: "A", email: "ana@test.cl", contrasena: "secreto123" },
                "El nombre de usuario debe tener al menos 2 caracteres.",
            ],
            [
                {
                    nombre: "Ana",
                    email: "no-es-email",
                    contrasena: "secreto123",
                },
                "Ingresa un correo electrónico válido.",
            ],
            [
                {
                    nombre: "a".repeat(151),
                    email: "ana@test.cl",
                    contrasena: "secreto123",
                },
                "El nombre de usuario no puede superar 150 caracteres.",
            ],
            [
                {
                    nombre: "Ana",
                    email: `${"a".repeat(250)}@test.cl`,
                    contrasena: "secreto123",
                },
                "El correo electrónico no puede superar 255 caracteres.",
            ],
            [
                {
                    nombre: "Ana",
                    email: "ana@test.cl",
                    contrasena: "a".repeat(73),
                },
                "La contraseña no puede superar 72 bytes.",
            ],
        ];

        for (const [cuerpo, mensaje] of casos) {
            const respuesta = await jsonRequest(
                "/api/auth/register",
                "POST",
                cuerpo,
            );
            expect(respuesta.status).toBe(400);
            expect((await respuesta.json()).error).toBe(mensaje);
        }
    });

    it("impide registrar dos veces el mismo correo sin distinguir mayusculas", async () => {
        await registrarUsuario({
            nombre: "Ana",
            email: "ana@test.cl",
            contrasena: "secreto123",
        });

        const respuesta = await jsonRequest("/api/auth/register", "POST", {
            nombre: "Otra Ana",
            email: "ANA@Test.CL",
            contrasena: "secreto123",
        });

        expect(respuesta.status).toBe(409);
        expect((await respuesta.json()).error).toBe(
            "Este correo electrónico ya se encuentra registrado.",
        );
    });

    it("inicia sesion con credenciales correctas y rechaza las incorrectas", async () => {
        await registrarUsuario({
            nombre: "Ana",
            email: "ana@test.cl",
            contrasena: "secreto123",
        });

        const correcto = await jsonRequest("/api/auth/login", "POST", {
            email: "ANA@TEST.CL",
            contrasena: "secreto123",
        });
        expect(correcto.status).toBe(200);
        expect((await correcto.json()).email).toBe("ana@test.cl");
        expect(correcto.headers.get("x-csrf-token")).toBeTruthy();
        expect(cookiesDe(correcto)).toContain("token=");

        const incorrecto = await jsonRequest("/api/auth/login", "POST", {
            email: "ana@test.cl",
            contrasena: "otra-clave",
        });
        expect(incorrecto.status).toBe(401);
        expect((await incorrecto.json()).error).toBe(
            "El correo o la contraseña son incorrectos.",
        );

        const inexistente = await jsonRequest("/api/auth/login", "POST", {
            email: "nadie@test.cl",
            contrasena: "secreto123",
        });
        expect(inexistente.status).toBe(401);

        const incompleto = await jsonRequest("/api/auth/login", "POST", {
            email: "ana@test.cl",
        });
        expect(incompleto.status).toBe(400);
    });

    it("me exige cookie y CSRF validos", async () => {
        const { respuesta } = await registrarUsuario({
            nombre: "Ana",
            email: "ana@test.cl",
            contrasena: "secreto123",
        });
        const usuario = await respuesta.json();
        const cookie = cookiesDe(respuesta);
        const csrf = respuesta.headers.get("x-csrf-token")!;

        const valido = await api("/api/auth/me", {
            headers: { cookie, "x-csrf-token": csrf },
        });
        expect(valido.status).toBe(200);
        expect(await valido.json()).toMatchObject({
            id: usuario.id,
            email: "ana@test.cl",
            nombre: "Ana",
        });

        const sinCookie = await api("/api/auth/me");
        expect(sinCookie.status).toBe(401);

        const csrfIncorrecto = await api("/api/auth/me", {
            headers: { cookie, "x-csrf-token": "otro-token" },
        });
        expect(csrfIncorrecto.status).toBe(401);

        const tokenInvalido = await api("/api/auth/me", {
            headers: { cookie: "token=no-es-un-jwt", "x-csrf-token": csrf },
        });
        expect(tokenInvalido.status).toBe(401);
    });

    it("logout elimina la cookie de sesion", async () => {
        const { sesion } = await registrarUsuario({
            nombre: "Ana",
            email: "ana@test.cl",
            contrasena: "secreto123",
        });

        const respuesta = await peticionAutenticada(
            sesion,
            "/api/auth/logout",
            { method: "POST" },
        );

        expect(respuesta.status).toBe(200);
        expect((await respuesta.json()).message).toBe(
            "Sesión cerrada correctamente",
        );
        expect(respuesta.headers.get("set-cookie")).toMatch(/token=;/);
    });

    it("devuelve 401 cuando el usuario de la sesion ya no existe", async () => {
        const { respuesta, sesion } = await registrarUsuario({
            nombre: "Ana",
            email: "ana@test.cl",
            contrasena: "secreto123",
        });
        const usuario = await respuesta.json();

        await query("DELETE FROM users WHERE id = $1;", [usuario.id]);

        const me = await peticionAutenticada(sesion, "/api/auth/me");
        expect(me.status).toBe(401);
    });

    it("agrega y quita favoritos de peliculas y cines de forma persistente", async () => {
        const pelicula = await crearPelicula({ titulo: "Favorita" });
        const cine = await crearCine({ id: "cinemark:77", origenId: "77" });
        const { sesion } = await registrarUsuario({
            nombre: "Ana",
            email: "ana@test.cl",
            contrasena: "secreto123",
        });

        const vacio = await peticionAutenticada(
            sesion,
            "/api/perfil/favoritos",
        );
        expect(vacio.status).toBe(200);
        expect(await vacio.json()).toEqual({
            peliculasFavoritas: [],
            cinesFavoritos: [],
        });

        const agregarPelicula = await peticionAutenticada(
            sesion,
            `/api/perfil/favoritos/peliculas/${pelicula.id}`,
            { method: "POST" },
        );
        expect(agregarPelicula.status).toBe(200);
        expect(await agregarPelicula.json()).toEqual({
            peliculasFavoritas: [String(pelicula.id)],
        });

        const agregarCine = await peticionAutenticada(
            sesion,
            `/api/perfil/favoritos/cines/${cine.id}`,
            { method: "POST" },
        );
        expect(agregarCine.status).toBe(200);
        expect(await agregarCine.json()).toEqual({
            cinesFavoritos: [cine.id],
        });

        const conFavoritos = await peticionAutenticada(
            sesion,
            "/api/perfil/favoritos",
        );
        expect(await conFavoritos.json()).toEqual({
            peliculasFavoritas: [String(pelicula.id)],
            cinesFavoritos: [cine.id],
        });

        const quitarPelicula = await peticionAutenticada(
            sesion,
            `/api/perfil/favoritos/peliculas/${pelicula.id}`,
            { method: "POST" },
        );
        expect(await quitarPelicula.json()).toEqual({
            peliculasFavoritas: [],
        });
    });

    it("valida favoritos inexistentes o con ids invalidos y exige sesion", async () => {
        const { sesion } = await registrarUsuario({
            nombre: "Ana",
            email: "ana@test.cl",
            contrasena: "secreto123",
        });

        const sinSesion = await api("/api/perfil/favoritos");
        expect(sinSesion.status).toBe(401);

        const peliculaInexistente = await peticionAutenticada(
            sesion,
            "/api/perfil/favoritos/peliculas/999999",
            { method: "POST" },
        );
        expect(peliculaInexistente.status).toBe(404);

        const peliculaInvalida = await peticionAutenticada(
            sesion,
            "/api/perfil/favoritos/peliculas/abc",
            { method: "POST" },
        );
        expect(peliculaInvalida.status).toBe(400);

        const cineInexistente = await peticionAutenticada(
            sesion,
            "/api/perfil/favoritos/cines/cinemark:999",
            { method: "POST" },
        );
        expect(cineInexistente.status).toBe(404);

        // isCineId solo exige un string no vacio de hasta 100 caracteres;
        // "abc" es valido y termina en 404 por no existir. El 400 se produce
        // cuando el id excede el largo permitido.
        const cineInvalido = await peticionAutenticada(
            sesion,
            `/api/perfil/favoritos/cines/${"a".repeat(101)}`,
            { method: "POST" },
        );
        expect(cineInvalido.status).toBe(400);
    });

    it("responde 401 en favoritos cuando el usuario de la sesion ya no existe", async () => {
        const { respuesta, sesion } = await registrarUsuario({
            nombre: "Ana",
            email: "ana@test.cl",
            contrasena: "secreto123",
        });
        const usuario = await respuesta.json();

        await query("DELETE FROM users WHERE id = $1;", [usuario.id]);

        const listado = await peticionAutenticada(
            sesion,
            "/api/perfil/favoritos",
        );
        expect(listado.status).toBe(401);

        const agregarPelicula = await peticionAutenticada(
            sesion,
            "/api/perfil/favoritos/peliculas/1",
            { method: "POST" },
        );
        expect(agregarPelicula.status).toBe(401);

        const agregarCine = await peticionAutenticada(
            sesion,
            "/api/perfil/favoritos/cines/cinemark:1",
            { method: "POST" },
        );
        expect(agregarCine.status).toBe(401);
    });
});
