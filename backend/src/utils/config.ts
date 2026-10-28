import "dotenv/config";

const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const DATABASE_SCHEMA = process.env.DATABASE_SCHEMA || "public";
const DATABASE_URL = process.env.DATABASE_URL;

if (!JWT_SECRET) {
    throw new Error(
        "Debe configurar JWT_SECRET en el archivo .env del backend",
    );
}

export default { DATABASE_URL, DATABASE_SCHEMA, JWT_SECRET, FRONTEND_URL };
