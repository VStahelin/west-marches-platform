import bcrypt from "bcryptjs";
import { Router } from "express";
import { pool } from "../db.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// requireAdmin decodifica e valida a assinatura do JWT antes de deixar passar —
// é o "double check" server-side: o token não pode ser forjado só trocando o payload.
router.get("/", requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, username, is_admin, created_at FROM users ORDER BY created_at ASC`,
  );

  res.json(rows);
});

router.post("/", requireAdmin, async (req, res) => {
  const { username, password, isAdmin } = req.body ?? {};

  if (typeof username !== "string" || !username.trim()) {
    return res.status(400).json({ message: "Informe um nome de usuário." });
  }

  if (typeof password !== "string" || password.length < 4) {
    return res.status(400).json({ message: "A senha precisa ter pelo menos 4 caracteres." });
  }

  const trimmedUsername = username.trim();

  const existing = await pool.query(`SELECT id FROM users WHERE username = $1`, [trimmedUsername]);

  if (existing.rows.length > 0) {
    return res.status(409).json({ message: "Esse usuário já existe." });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { rows } = await pool.query(
    `INSERT INTO users (username, password_hash, is_admin)
     VALUES ($1, $2, $3)
     RETURNING id, username, is_admin, created_at`,
    [trimmedUsername, passwordHash, Boolean(isAdmin)],
  );

  res.status(201).json(rows[0]);
});

router.param("id", (req, res, next, value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 0) {
    return res.status(400).json({ message: "Usuário inválido." });
  }

  req.targetUserId = id;
  next();
});

async function loadUser(id) {
  const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

router.put("/:id", requireAdmin, async (req, res) => {
  const target = await loadUser(req.targetUserId);

  if (!target) {
    return res.status(404).json({ message: "Usuário não encontrado." });
  }

  const { username, password, isAdmin } = req.body ?? {};

  if (typeof username !== "string" || !username.trim()) {
    return res.status(400).json({ message: "Informe um nome de usuário." });
  }

  if (password && password.length < 4) {
    return res.status(400).json({ message: "A senha precisa ter pelo menos 4 caracteres." });
  }

  const trimmedUsername = username.trim();

  const existing = await pool.query(`SELECT id FROM users WHERE username = $1 AND id != $2`, [
    trimmedUsername,
    target.id,
  ]);

  if (existing.rows.length > 0) {
    return res.status(409).json({ message: "Esse usuário já existe." });
  }

  const passwordHash = password ? await bcrypt.hash(password, 10) : target.password_hash;

  const { rows } = await pool.query(
    `UPDATE users SET username = $1, password_hash = $2, is_admin = $3
     WHERE id = $4
     RETURNING id, username, is_admin, created_at`,
    [trimmedUsername, passwordHash, Boolean(isAdmin), target.id],
  );

  res.json(rows[0]);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const target = await loadUser(req.targetUserId);

  if (!target) {
    return res.status(404).json({ message: "Usuário não encontrado." });
  }

  if (target.username === req.user.username) {
    return res.status(400).json({ message: "Você não pode remover sua própria conta." });
  }

  await pool.query(`DELETE FROM users WHERE id = $1`, [target.id]);
  res.status(204).send();
});

export default router;
