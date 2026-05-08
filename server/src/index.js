import "dotenv/config";
import express from "express";
import cors from "cors";
import basicAuth from "express-basic-auth";
import path from "path";
import { fileURLToPath } from "url";
import translationRouter from "./routes/translation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ?? 3000;

if (process.env.APP_PASSWORD) {
  app.use(basicAuth({
    users: { [process.env.APP_USER ?? "admin"]: process.env.APP_PASSWORD },
    challenge: true,
  }));
}

app.use(cors());
app.use(express.json());

app.use("/api/translation", translationRouter);

const staticPath = path.join(__dirname, "../client/dist");
app.use(express.static(staticPath));

app.get("*", (_req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
