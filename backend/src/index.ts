import dotenv from "dotenv";
dotenv.config();
import app from "./app.ts";

const PORT = process.env.PORT;
const HOST = process.env.POST || "localhost";

app.listen(Number(PORT), HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
