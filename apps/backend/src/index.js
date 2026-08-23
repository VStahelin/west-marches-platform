import cors from "cors";
import express from "express";
import { initDb, pool } from "./db.js";
import { uploadsDir } from "./uploads-dir.js";
import authRouter from "./routes/auth.js";
import charactersRouter from "./routes/characters.js";
import mapRouter from "./routes/map.js";
import pinsRouter from "./routes/pins.js";
import quadrantsRouter from "./routes/quadrants.js";
import usersRouter from "./routes/users.js";
import wikiRouter from "./routes/wiki.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/health/db", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (error) {
    res.status(503).json({ status: "error", message: error.message });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/map", mapRouter);
app.use("/api/quadrants", quadrantsRouter);
app.use("/api/characters", charactersRouter);
app.use("/api/users", usersRouter);
app.use("/api/pins", pinsRouter);
app.use("/api/wiki", wikiRouter);

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Backend rodando em http://localhost:${PORT}`);
  });
}

start();
