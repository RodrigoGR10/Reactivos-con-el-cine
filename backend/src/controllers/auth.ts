import express from "express";
import bcrypt from "bcrypt";
import UserModel from "../models/user.ts";

const router = express.Router();

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

  return res.json(user);
});

export default router;
