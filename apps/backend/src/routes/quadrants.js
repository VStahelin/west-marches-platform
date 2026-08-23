import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { quadrantsDir } from "../quadrants-dir.js";

const router = Router();

function parseCoord(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

router.param("row", (req, res, next, value) => {
  const row = parseCoord(value);
  if (row === null) return res.status(400).json({ message: "Quadrante inválido." });
  req.row = row;
  next();
});

router.param("col", (req, res, next, value) => {
  const col = parseCoord(value);
  if (col === null) return res.status(400).json({ message: "Quadrante inválido." });
  req.col = col;
  next();
});

router.param("id", (req, res, next, value) => {
  const id = parseCoord(value);
  if (id === null) return res.status(400).json({ message: "Comentário inválido." });
  req.commentId = id;
  next();
});

function summaryPath(row, col) {
  return path.join(quadrantsDir, `${row}-${col}.md`);
}

router.get("/:row/:col/summary", (req, res) => {
  const filePath = summaryPath(req.row, req.col);
  const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
  res.json({ content });
});

router.put("/:row/:col/summary", requireAuth, (req, res) => {
  const { content } = req.body ?? {};

  if (typeof content !== "string") {
    return res.status(400).json({ message: "Conteúdo inválido." });
  }

  fs.writeFileSync(summaryPath(req.row, req.col), content, "utf-8");
  res.json({ content });
});

router.get("/:row/:col/comments", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, author, content, created_by, created_at
     FROM quadrant_comments
     WHERE grid_row = $1 AND grid_col = $2
     ORDER BY created_at ASC`,
    [req.row, req.col],
  );

  res.json(rows);
});

router.post("/:row/:col/comments", requireAuth, async (req, res) => {
  const { author, content } = req.body ?? {};

  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ message: "O rumor não pode ficar vazio." });
  }

  const { rows } = await pool.query(
    `INSERT INTO quadrant_comments (grid_row, grid_col, author, content, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, author, content, created_by, created_at`,
    [req.row, req.col, author?.trim() || null, content.trim(), req.user.username],
  );

  res.status(201).json(rows[0]);
});

async function loadComment(id, row, col) {
  const { rows } = await pool.query(
    `SELECT * FROM quadrant_comments WHERE id = $1 AND grid_row = $2 AND grid_col = $3`,
    [id, row, col],
  );

  return rows[0] ?? null;
}

function canModify(user, comment) {
  return user.role === "admin" || user.username === comment.created_by;
}

router.put("/:row/:col/comments/:id", requireAuth, async (req, res) => {
  const comment = await loadComment(req.commentId, req.row, req.col);

  if (!comment) {
    return res.status(404).json({ message: "Rumor não encontrado." });
  }

  if (!canModify(req.user, comment)) {
    return res.status(403).json({ message: "Você só pode editar seus próprios rumores." });
  }

  const { author, content } = req.body ?? {};

  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ message: "O rumor não pode ficar vazio." });
  }

  const { rows } = await pool.query(
    `UPDATE quadrant_comments SET author = $1, content = $2
     WHERE id = $3
     RETURNING id, author, content, created_by, created_at`,
    [author?.trim() || null, content.trim(), comment.id],
  );

  res.json(rows[0]);
});

router.delete("/:row/:col/comments/:id", requireAuth, async (req, res) => {
  const comment = await loadComment(req.commentId, req.row, req.col);

  if (!comment) {
    return res.status(404).json({ message: "Rumor não encontrado." });
  }

  if (!canModify(req.user, comment)) {
    return res.status(403).json({ message: "Você só pode remover seus próprios rumores." });
  }

  await pool.query(`DELETE FROM quadrant_comments WHERE id = $1`, [comment.id]);
  res.status(204).send();
});

export default router;
