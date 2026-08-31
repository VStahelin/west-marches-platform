import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.param("id", (req, res, next, value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 0) {
    return res.status(400).json({ message: "Campanha inválida." });
  }

  req.campaignId = id;
  next();
});

router.param("ataId", (req, res, next, value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 0) {
    return res.status(400).json({ message: "Ata inválida." });
  }

  req.ataId = id;
  next();
});

async function loadCampaign(id) {
  const { rows } = await pool.query(`SELECT * FROM campaigns WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

function canDeleteCampaign(user, campaign) {
  return user.isAdmin || user.username === campaign.master_username;
}

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, master_username, created_at FROM campaigns ORDER BY created_at ASC`,
  );

  res.json(rows);
});

router.post("/", requireAuth, async (req, res) => {
  const { name } = req.body ?? {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ message: "A campanha precisa de um nome." });
  }

  const { rows } = await pool.query(
    `INSERT INTO campaigns (name, master_username) VALUES ($1, $2) RETURNING *`,
    [name.trim(), req.user.username],
  );

  res.status(201).json(rows[0]);
});

router.get("/:id", async (req, res) => {
  const campaign = await loadCampaign(req.campaignId);

  if (!campaign) {
    return res.status(404).json({ message: "Campanha não encontrada." });
  }

  res.json(campaign);
});

router.put("/:id", requireAuth, async (req, res) => {
  const campaign = await loadCampaign(req.campaignId);

  if (!campaign) {
    return res.status(404).json({ message: "Campanha não encontrada." });
  }

  const { prologo } = req.body ?? {};

  if (typeof prologo !== "string") {
    return res.status(400).json({ message: "Conteúdo inválido." });
  }

  const { rows } = await pool.query(`UPDATE campaigns SET prologo = $1 WHERE id = $2 RETURNING *`, [
    prologo,
    campaign.id,
  ]);

  res.json(rows[0]);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const campaign = await loadCampaign(req.campaignId);

  if (!campaign) {
    return res.status(404).json({ message: "Campanha não encontrada." });
  }

  if (!canDeleteCampaign(req.user, campaign)) {
    return res.status(403).json({ message: "Só o mestre da campanha ou um admin pode removê-la." });
  }

  await pool.query(`DELETE FROM campaigns WHERE id = $1`, [campaign.id]);
  res.status(204).send();
});

router.get("/:id/atas", async (req, res) => {
  const campaign = await loadCampaign(req.campaignId);

  if (!campaign) {
    return res.status(404).json({ message: "Campanha não encontrada." });
  }

  const { rows } = await pool.query(
    `SELECT * FROM campaign_atas WHERE campaign_id = $1 ORDER BY created_at ASC`,
    [campaign.id],
  );

  res.json(rows);
});

router.post("/:id/atas", requireAuth, async (req, res) => {
  const campaign = await loadCampaign(req.campaignId);

  if (!campaign) {
    return res.status(404).json({ message: "Campanha não encontrada." });
  }

  const { title, content } = req.body ?? {};

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ message: "A ata precisa de um título." });
  }

  const { rows } = await pool.query(
    `INSERT INTO campaign_atas (campaign_id, title, content, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [campaign.id, title.trim(), typeof content === "string" ? content : "", req.user.username],
  );

  res.status(201).json(rows[0]);
});

async function loadAta(campaignId, ataId) {
  const { rows } = await pool.query(`SELECT * FROM campaign_atas WHERE id = $1 AND campaign_id = $2`, [
    ataId,
    campaignId,
  ]);

  return rows[0] ?? null;
}

router.put("/:id/atas/:ataId", requireAuth, async (req, res) => {
  const ata = await loadAta(req.campaignId, req.ataId);

  if (!ata) {
    return res.status(404).json({ message: "Ata não encontrada." });
  }

  const { title, content } = req.body ?? {};

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ message: "A ata precisa de um título." });
  }

  const { rows } = await pool.query(
    `UPDATE campaign_atas SET title = $1, content = $2 WHERE id = $3 RETURNING *`,
    [title.trim(), typeof content === "string" ? content : "", ata.id],
  );

  res.json(rows[0]);
});

router.delete("/:id/atas/:ataId", requireAuth, async (req, res) => {
  const ata = await loadAta(req.campaignId, req.ataId);

  if (!ata) {
    return res.status(404).json({ message: "Ata não encontrada." });
  }

  await pool.query(`DELETE FROM campaign_atas WHERE id = $1`, [ata.id]);
  res.status(204).send();
});

export default router;
