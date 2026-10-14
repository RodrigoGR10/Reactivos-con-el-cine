import express, { type Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import UserModel from "../models/user.ts";
import config from "../utils/config.ts";
import middleware from "../utils/middleware.ts";

const router = express.Router();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

const createSession = (response: Response, user: { id: string; email: string }) => {
  const userForToken = {
    id: user.id,
    email: user.email,
    csrf: randomUUID(),
  };
  const token = jwt.sign(userForToken, config.JWT_SECRET, { expiresIn: 60 * 60 });

  response.setHeader("X-CSRF-Token", userForToken.csrf);
  response.cookie("token", token, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
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
  const existe = await UserModel.findOne({ email: emailNormalizado });
  if (existe) {
    return res
      .status(400)
      .json({ error: "Este correo electrónico ya se encuentra registrado." });
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(contrasena, saltRounds);

  const nuevoUsuario = new UserModel({
    nombre: nombre.trim(),
    email: emailNormalizado,
    passwordHash,
  });

  const guardado = await nuevoUsuario.save();
  createSession(res, guardado);
  return res.status(201).json(guardado);
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
  const user = await UserModel.findOne({ email: emailNormalizado });

  const passwordCorrecta =
    user === null
      ? false
      : await bcrypt.compare(contrasena, user.passwordHash);

  if (!(user && passwordCorrecta)) {
    return res
      .status(401)
      .json({ error: "El correo o la contraseña son incorrectos." });
  }

  createSession(res, user);
  return res.json(user);
});

router.get("/me", middleware.withUser, async (req, res) => {
  const user = await UserModel.findById(req.userId);
  if (!user) {
    return res.status(401).json({ error: "El usuario de la sesión no existe" });
  }

  res.setHeader("X-CSRF-Token", req.headers["x-csrf-token"] as string);
  return res.json(user);
});

router.post("/logout", middleware.withUser, (req, res) => {
  res.clearCookie("token", cookieOptions);
  return res.json({ message: "Sesión cerrada correctamente" });
});

export default router;
