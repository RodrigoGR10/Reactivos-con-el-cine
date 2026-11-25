import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import config from "../config.ts";
import middleware from "../middleware.ts";

describe("middleware", () => {
    describe("withUser", () => {
        it("retorna 401 si no hay cookie con token", async () => {
            const req = { cookies: {}, headers: {} } as unknown as Request;
            const res = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            } as unknown as Response;
            const next = vi.fn();

            await middleware.withUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: "No hay una sesión activa",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("retorna 401 si el CSRF token no coincide", async () => {
            const token = jwt.sign(
                { id: "usr_123", csrf: "csrf_secret_a" },
                config.JWT_SECRET,
            );
            const req = {
                cookies: { token },
                headers: { "x-csrf-token": "csrf_different" },
            } as unknown as Request;
            const res = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            } as unknown as Response;
            const next = vi.fn();

            await middleware.withUser(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: "Sesión o token CSRF inválido",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("inyecta userId y llama a next() cuando token y CSRF son válidos", async () => {
            const token = jwt.sign(
                { id: "usr_456", csrf: "valid_csrf_token" },
                config.JWT_SECRET,
            );
            const req = {
                cookies: { token },
                headers: { "x-csrf-token": "valid_csrf_token" },
            } as unknown as Request;
            const res = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            } as unknown as Response;
            const next = vi.fn();

            await middleware.withUser(req, res, next);

            expect(req.userId).toBe("usr_456");
            expect(next).toHaveBeenCalledTimes(1);
        });
    });

    describe("unknownEndpoint", () => {
        it("responde 404 con mensaje 'Ruta no encontrada'", () => {
            const req = {} as Request;
            const res = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            } as unknown as Response;
            const next = vi.fn();

            middleware.unknownEndpoint(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: "Ruta no encontrada",
            });
        });
    });

    describe("errorHandler", () => {
        it("pasa el error al siguiente handler si los headers ya fueron enviados", () => {
            const error = new Error("Boom");
            const req = {} as Request;
            const res = { headersSent: true } as Response;
            const next = vi.fn();

            middleware.errorHandler(error, req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });

        it("retorna 401 ante JsonWebTokenError", () => {
            const error = {
                name: "JsonWebTokenError",
                message: "jwt malformed",
            };
            const req = {} as Request;
            const res = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            } as unknown as Response;
            const next = vi.fn();

            middleware.errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: "Sesión inválida" });
        });

        it("retorna 401 ante TokenExpiredError", () => {
            const error = { name: "TokenExpiredError", message: "jwt expired" };
            const req = {} as Request;
            const res = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            } as unknown as Response;
            const next = vi.fn();

            middleware.errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: "La sesión ha expirado",
            });
        });

        it("retorna 409 ante clave duplicada de PostgreSQL (23505) en email", () => {
            const error = {
                name: "DatabaseError",
                message: "duplicate key",
                code: "23505",
                constraint: "users_email_key",
            };
            const req = {} as Request;
            const res = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            } as unknown as Response;
            const next = vi.fn();

            middleware.errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                error: "Este correo electrónico ya se encuentra registrado.",
            });
        });

        it("retorna 400 ante JSON mal formado en body", () => {
            const error = {
                name: "SyntaxError",
                message: "Unexpected token",
                type: "entity.parse.failed",
            };
            const req = {} as Request;
            const res = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            } as unknown as Response;
            const next = vi.fn();

            middleware.errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: "El JSON de la solicitud es inválido",
            });
        });

        it("retorna 500 para errores desconocidos no mapeados", () => {
            const error = { name: "Error", message: "Error inesperado" };
            const req = {} as Request;
            const res = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            } as unknown as Response;
            const next = vi.fn();

            middleware.errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: "Error interno del servidor",
            });
        });
    });
});
