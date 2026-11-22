import dotenv from "dotenv";
dotenv.config();
import app from "./app.ts";

/** Inicia el servidor HTTP usando HOST y PORT del entorno, con valores locales por defecto. */
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "localhost";

/** Escucha solicitudes HTTP y registra la dirección local del servidor. */
app.listen(Number(PORT), HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});
