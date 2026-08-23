import cors from "cors";
import express from "express";
import { pool } from "./db.js";
import { uploadsDir } from "./uploads-dir.js";
import authRouter from "./routes/auth.js";
import mapRouter from "./routes/map.js";

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

app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
