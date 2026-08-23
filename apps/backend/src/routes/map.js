import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { requireAdmin } from "../middleware/auth.js";
import { uploadsDir } from "../uploads-dir.js";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const BACKGROUND_PREFIX = "map-background";

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `${BACKGROUND_PREFIX}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ALLOWED_TYPES.has(file.mimetype)),
});

const router = Router();

function findCurrentBackground() {
  return fs.readdirSync(uploadsDir).find((name) => name.startsWith(BACKGROUND_PREFIX)) ?? null;
}

router.get("/background", (req, res) => {
  const file = findCurrentBackground();
  res.json({ url: file ? `/uploads/${file}` : null });
});

router.post("/background", requireAdmin, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Envie uma imagem válida (png, jpg ou webp)." });
  }

  // Remove versões antigas com extensão diferente da que acabou de ser enviada.
  for (const name of fs.readdirSync(uploadsDir)) {
    if (name.startsWith(BACKGROUND_PREFIX) && name !== req.file.filename) {
      fs.unlinkSync(path.join(uploadsDir, name));
    }
  }

  res.json({ url: `/uploads/${req.file.filename}` });
});

export default router;
