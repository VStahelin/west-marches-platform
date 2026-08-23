import { Router } from "express";
import { pool } from "../db.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = Router();

export const PIN_ICONS = new Set(["💀", "💰", "❗", "🏰", "⚔️", "📍"]);

function parseCoord(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

function toPublicPin(row, user) {
  const { created_by, ...rest } = row;
  return {
    ...rest,
    canModify: Boolean(user) && (user.isAdmin || user.username === created_by),
  };
}

router.get("/", optionalAuth, async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM map_pins ORDER BY created_at ASC`);
  res.json(rows.map((row) => toPublicPin(row, req.user)));
});

router.post("/", requireAuth, async (req, res) => {
  const { x, y, icon, label } = req.body ?? {};

  const parsedX = parseCoord(x);
  const parsedY = parseCoord(y);

  if (parsedX === null || parsedY === null) {
    return res.status(400).json({ message: "Posição inválida." });
  }

  if (!PIN_ICONS.has(icon)) {
    return res.status(400).json({ message: "Ícone inválido." });
  }

  const { rows } = await pool.query(
    `INSERT INTO map_pins (x, y, icon, label, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [parsedX, parsedY, icon, label?.trim() || null, req.user.username],
  );

  res.status(201).json(toPublicPin(rows[0], req.user));
});

router.param("id", (req, res, next, value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 0) {
    return res.status(400).json({ message: "Pin inválido." });
  }

  req.pinId = id;
  next();
});

async function loadPin(id) {
  const { rows } = await pool.query(`SELECT * FROM map_pins WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

function canModify(user, pin) {
  return user.isAdmin || user.username === pin.created_by;
}

router.put("/:id", requireAuth, async (req, res) => {
  const pin = await loadPin(req.pinId);

  if (!pin) {
    return res.status(404).json({ message: "Pin não encontrado." });
  }

  if (!canModify(req.user, pin)) {
    return res.status(403).json({ message: "Você só pode editar seus próprios pins." });
  }

  const { x, y, label } = req.body ?? {};

  const parsedX = x !== undefined ? parseCoord(x) : pin.x;
  const parsedY = y !== undefined ? parseCoord(y) : pin.y;

  if (parsedX === null || parsedY === null) {
    return res.status(400).json({ message: "Posição inválida." });
  }

  const nextLabel = label !== undefined ? label?.trim() || null : pin.label;

  const { rows } = await pool.query(
    `UPDATE map_pins SET x = $1, y = $2, label = $3 WHERE id = $4 RETURNING *`,
    [parsedX, parsedY, nextLabel, pin.id],
  );

  res.json(toPublicPin(rows[0], req.user));
});

router.delete("/:id", requireAuth, async (req, res) => {
  const pin = await loadPin(req.pinId);

  if (!pin) {
    return res.status(404).json({ message: "Pin não encontrado." });
  }

  if (!canModify(req.user, pin)) {
    return res.status(403).json({ message: "Você só pode remover seus próprios pins." });
  }

  await pool.query(`DELETE FROM map_pins WHERE id = $1`, [pin.id]);
  res.status(204).send();
});

export default router;
