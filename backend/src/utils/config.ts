import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

if (!JWT_SECRET) {
  throw new Error("Debe configurar JWT_SECRET en el archivo .env del backend");
}

export default { JWT_SECRET, FRONTEND_URL };
