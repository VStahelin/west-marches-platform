import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function parseLevel(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

router.get("/", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, race, class, level, created_at
     FROM characters
     WHERE owner_username = $1
     ORDER BY created_at ASC`,
    [req.user.username],
  );

  res.json(rows);
});

router.post("/", requireAuth, async (req, res) => {
  const { name, race, class: characterClass, level } = req.body ?? {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ message: "O personagem precisa de um nome." });
  }

  const { rows } = await pool.query(
    `INSERT INTO characters (owner_username, name, race, class, level)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, race, class, level, created_at`,
    [
      req.user.username,
      name.trim(),
      race?.trim() || null,
      characterClass?.trim() || null,
      parseLevel(level),
    ],
  );

  res.status(201).json(rows[0]);
});

router.param("id", (req, res, next, value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 0) {
    return res.status(400).json({ message: "Personagem inválido." });
  }

  req.characterId = id;
  next();
});

async function loadOwnCharacter(id, username) {
  const { rows } = await pool.query(
    `SELECT * FROM characters WHERE id = $1 AND owner_username = $2`,
    [id, username],
  );

  return rows[0] ?? null;
}

router.put("/:id", requireAuth, async (req, res) => {
  const character = await loadOwnCharacter(req.characterId, req.user.username);

  if (!character) {
    return res.status(404).json({ message: "Personagem não encontrado." });
  }

  const { name, race, class: characterClass, level } = req.body ?? {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ message: "O personagem precisa de um nome." });
  }

  const { rows } = await pool.query(
    `UPDATE characters SET name = $1, race = $2, class = $3, level = $4
     WHERE id = $5
     RETURNING id, name, race, class, level, created_at`,
    [name.trim(), race?.trim() || null, characterClass?.trim() || null, parseLevel(level), character.id],
  );

  res.json(rows[0]);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const character = await loadOwnCharacter(req.characterId, req.user.username);

  if (!character) {
    return res.status(404).json({ message: "Personagem não encontrado." });
  }

  await pool.query(`DELETE FROM characters WHERE id = $1`, [character.id]);
  res.status(204).send();
});

export default router;
