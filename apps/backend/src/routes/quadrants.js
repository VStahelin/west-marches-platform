import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { pool } from "../db.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
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

const COMMENT_SELECT = `
  SELECT c.id, c.content, c.is_anonymous, c.character_id, c.created_by, c.created_at,
         ch.name AS character_name, ch.race AS character_race,
         ch.class AS character_class, ch.level AS character_level
  FROM quadrant_comments c
  LEFT JOIN characters ch ON ch.id = c.character_id
`;

// Nunca expõe created_by (o username real) — só quem pode editar/remover, pra não
// vazar a identidade de quem postou um rumor marcado como anônimo.
function toPublicComment(row, user) {
  const { created_by, ...rest } = row;
  return {
    ...rest,
    canModify: Boolean(user) && (user.isAdmin || user.username === created_by),
  };
}

async function findCommentById(id, user) {
  const { rows } = await pool.query(`${COMMENT_SELECT} WHERE c.id = $1`, [id]);
  return rows[0] ? toPublicComment(rows[0], user) : null;
}

async function resolveCharacterId({ isAnonymous, characterId, username }, res) {
  if (isAnonymous) {
    return { ok: true, characterId: null };
  }

  const parsedId = Number(characterId);

  if (!Number.isInteger(parsedId)) {
    res.status(400).json({ message: "Selecione um personagem ou marque como anônimo." });
    return { ok: false };
  }

  const { rows } = await pool.query(
    `SELECT id FROM characters WHERE id = $1 AND owner_username = $2`,
    [parsedId, username],
  );

  if (rows.length === 0) {
    res.status(400).json({ message: "Personagem inválido." });
    return { ok: false };
  }

  return { ok: true, characterId: parsedId };
}

router.get("/:row/:col/comments", optionalAuth, async (req, res) => {
  const { rows } = await pool.query(
    `${COMMENT_SELECT} WHERE c.grid_row = $1 AND c.grid_col = $2 ORDER BY c.created_at ASC`,
    [req.row, req.col],
  );

  res.json(rows.map((row) => toPublicComment(row, req.user)));
});

router.post("/:row/:col/comments", requireAuth, async (req, res) => {
  const { content, isAnonymous, characterId } = req.body ?? {};

  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ message: "O rumor não pode ficar vazio." });
  }

  const resolved = await resolveCharacterId(
    { isAnonymous, characterId, username: req.user.username },
    res,
  );
  if (!resolved.ok) return;

  const { rows } = await pool.query(
    `INSERT INTO quadrant_comments (grid_row, grid_col, content, created_by, character_id, is_anonymous)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [req.row, req.col, content.trim(), req.user.username, resolved.characterId, Boolean(isAnonymous)],
  );

  res.status(201).json(await findCommentById(rows[0].id, req.user));
});

async function loadComment(id, row, col) {
  const { rows } = await pool.query(
    `SELECT * FROM quadrant_comments WHERE id = $1 AND grid_row = $2 AND grid_col = $3`,
    [id, row, col],
  );

  return rows[0] ?? null;
}

function canModify(user, comment) {
  return user.isAdmin || user.username === comment.created_by;
}

router.put("/:row/:col/comments/:id", requireAuth, async (req, res) => {
  const comment = await loadComment(req.commentId, req.row, req.col);

  if (!comment) {
    return res.status(404).json({ message: "Rumor não encontrado." });
  }

  if (!canModify(req.user, comment)) {
    return res.status(403).json({ message: "Você só pode editar seus próprios rumores." });
  }

  const { content, isAnonymous, characterId } = req.body ?? {};

  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ message: "O rumor não pode ficar vazio." });
  }

  const resolved = await resolveCharacterId(
    { isAnonymous, characterId, username: req.user.username },
    res,
  );
  if (!resolved.ok) return;

  await pool.query(
    `UPDATE quadrant_comments SET content = $1, character_id = $2, is_anonymous = $3
     WHERE id = $4`,
    [content.trim(), resolved.characterId, Boolean(isAnonymous), comment.id],
  );

  res.json(await findCommentById(comment.id, req.user));
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
