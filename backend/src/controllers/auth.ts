import express, { type Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { isUuid, query } from "../db.ts";
import config from "../utils/config.ts";
import middleware from "../utils/middleware.ts";

const router = express.Router();

const usuarioPublico = (u: {
    id: string;
    email: string;
    nombre: string | null;
    fechaRegistro?: Date;
}) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    fechaRegistro: u.fechaRegistro?.toISOString(),
});

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
};

const createSession = (
    response: Response,
    user: { id: string; email: string },
) => {
    const userForToken = {
        id: user.id,
        email: user.email,
        csrf: randomUUID(),
    };
    const token = jwt.sign(userForToken, config.JWT_SECRET, {
        expiresIn: 60 * 60,
    });

    response.setHeader("X-CSRF-Token", userForToken.csrf);
    response.cookie("token", token, {
        ...cookieOptions,
        maxAge: 60 * 60 * 1000,
    });
};

router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

router.post("/register", async (req, res) => {
    const { nombre, email, contrasena } = req.body ?? {};

    if (
        typeof nombre !== "string" ||
        !nombre.trim() ||
        typeof email !== "string" ||
        !email.trim() ||
        typeof contrasena !== "string" ||
        !contrasena
    ) {
        return res
            .status(400)
            .json({ error: "Todos los campos son obligatorios" });
    }

    if (contrasena.length < 6) {
        return res
            .status(400)
            .json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    const emailNormalizado = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNormalizado)) {
        return res
            .status(400)
            .json({ error: "Ingresa un correo electrónico válido." });
    }

    const checkEmail = await query("SELECT id FROM users WHERE email = $1", [
        emailNormalizado,
    ]);
    
    if (checkEmail.rows.length > 0) {
        return res.status(400).json({
            error: "Este correo electrónico ya se encuentra registrado.",
        });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(contrasena, salt);

    const insertSql = `
        INSERT INTO users (email, password_hash, nombre)
        VALUES ($1, $2, $3)
        RETURNING id, email, nombre, creado_en AS "fechaRegistro";
    `;

    const { rows } = await query(insertSql, [
        emailNormalizado,
        passwordHash,
        nombre.trim(),
    ]);

    const user = rows[0];

    createSession(res, { id: user.id, email: user.email });

    return res.status(201).json(usuarioPublico(user));
});

router.post("/login", async (req, res) => {
    const { email, contrasena } = req.body ?? {};

    if (
        typeof email !== "string" ||
        !email.trim() ||
        typeof contrasena !== "string" ||
        !contrasena
    ) {
        return res
            .status(400)
            .json({ error: "Debe ingresar correo y contraseña" });
    }

    const emailNormalizado = email.trim().toLowerCase();

    const sql = `
        SELECT id, email, nombre, password_hash, creado_en AS "fechaRegistro"
        FROM users
        WHERE email = $1;
    `;

    const { rows } = await query(sql, [emailNormalizado]);
    const user = rows[0];

    const passwordCorrecta = user
        ? await bcrypt.compare(contrasena, user.password_hash)
        : false;

    if (!(user && passwordCorrecta)) {
        return res
            .status(401)
            .json({ error: "El correo o la contraseña son incorrectos." });
    }

    createSession(res, { id: user.id, email: user.email });

    return res.json(usuarioPublico(user));
});

router.get("/me", middleware.withUser, async (req, res) => {
    const userId = req.userId;
    
    if (typeof userId !== "string" || !isUuid(userId)) {
        return res
            .status(401)
            .json({ error: "El usuario de la sesión no existe" });
    }

    const sql = `
        SELECT id, email, nombre, creado_en AS "fechaRegistro"
        FROM users
        WHERE id = $1;
    `;

    const { rows } = await query(sql, [userId]);

    if (rows.length === 0) {
        return res
            .status(404)
            .json({ error: "El usuario de la sesión no existe" });
    }

    res.setHeader("X-CSRF-Token", req.headers["x-csrf-token"] as string);
    return res.json(rows[0]);
});

router.post("/logout", middleware.withUser, (req, res) => {
    res.clearCookie("token", cookieOptions);
    return res.json({ message: "Sesión cerrada correctamente" });
});

export default router;