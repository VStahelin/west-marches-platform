import bcrypt from "bcryptjs";
import { Router } from "express";
import { pool } from "../db.js";
import { signToken } from "../jwt.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ message: "Usuário e senha são obrigatórios." });
  }

  const { rows } = await pool.query(
    `SELECT username, password_hash, is_admin FROM users WHERE username = $1`,
    [username],
  );

  const record = rows[0];
  const passwordMatches = record ? await bcrypt.compare(password, record.password_hash) : false;

  if (!record || !passwordMatches) {
    return res.status(401).json({ message: "Usuário ou senha inválidos." });
  }

  const user = { username: record.username, isAdmin: record.is_admin };
  res.json({ token: signToken(user), user });
});

export default router;
