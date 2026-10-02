import express from "express";
import bcrypt from "bcrypt";
import UserModel from "../models/user.ts";

const router = express.Router();

router.post("/register", async (req, res, next) => {
  try {
    const { nombre, email, contrasena } = req.body;

    if (!nombre || !email || !contrasena) {
      return res
        .status(400)
        .json({ error: "Todos los campos son obligatorios" });
    }

    if (typeof contrasena !== "string" || contrasena.length < 6) {
      return res
        .status(400)
        .json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    const emailNormalizado = String(email).trim().toLowerCase();
    const existe = await UserModel.findOne({ email: emailNormalizado });
    if (existe) {
      return res
        .status(400)
        .json({ error: "Este correo electrónico ya se encuentra registrado." });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(contrasena, saltRounds);

    const nuevoUsuario = new UserModel({
      nombre: String(nombre).trim(),
      email: emailNormalizado,
      passwordHash,
    });

    const guardado = await nuevoUsuario.save();
    return res.status(201).json(guardado);
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, contrasena } = req.body;

    if (!email || !contrasena) {
      return res
        .status(400)
        .json({ error: "Debe ingresar correo y contraseña" });
    }

    const emailNormalizado = String(email).trim().toLowerCase();
    const user = await UserModel.findOne({ email: emailNormalizado });

    const passwordCorrecta =
      user === null
        ? false
        : await bcrypt.compare(String(contrasena), user.passwordHash);

    if (!(user && passwordCorrecta)) {
      return res
        .status(401)
        .json({ error: "El correo o la contraseña son incorrectos." });
    }

    return res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
