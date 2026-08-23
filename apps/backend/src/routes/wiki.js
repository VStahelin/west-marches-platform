import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { wikiDir } from "../wiki-dir.js";

const router = Router();

function sanitizeName(name) {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (!trimmed || trimmed === "." || trimmed === "..") return null;
  if (/[\\/\0]/.test(trimmed)) return null;
  return trimmed;
}

// Resolve um caminho relativo (ex: "regras/combate") para um caminho absoluto
// dentro de wikiDir, recusando qualquer tentativa de escapar da pasta (../, \, etc).
function resolveSafePath(relativePath) {
  const segments = String(relativePath ?? "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.some((segment) => segment === "." || segment === ".." || /[\\\0]/.test(segment))) {
    return null;
  }

  const root = path.resolve(wikiDir);
  const resolved = path.resolve(root, ...segments);

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    return null;
  }

  return resolved;
}

function buildTree(dir, relPath = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const folders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);

  folders.sort((a, b) => a.localeCompare(b, "pt-BR"));
  files.sort((a, b) => a.localeCompare(b, "pt-BR"));

  const folderNodes = folders.map((name) => {
    const childPath = relPath ? `${relPath}/${name}` : name;
    return {
      name,
      path: childPath,
      type: "folder",
      children: buildTree(path.join(dir, name), childPath),
    };
  });

  const fileNodes = files.map((name) => {
    const baseName = name.slice(0, -3);
    const childPath = relPath ? `${relPath}/${baseName}` : baseName;
    return { name: baseName, path: childPath, type: "file" };
  });

  return [...folderNodes, ...fileNodes];
}

router.get("/tree", (req, res) => {
  res.json(buildTree(wikiDir));
});

router.get("/pages/*", (req, res) => {
  const relPath = req.params[0];
  const filePath = resolveSafePath(relPath);

  if (!filePath) {
    return res.status(400).json({ message: "Caminho inválido." });
  }

  const fullPath = `${filePath}.md`;

  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return res.status(404).json({ message: "Página não encontrada." });
  }

  res.json({
    path: relPath,
    name: path.basename(relPath),
    content: fs.readFileSync(fullPath, "utf-8"),
  });
});

router.post("/pages", requireAdmin, (req, res) => {
  const { parentPath, name, content } = req.body ?? {};
  const safeName = sanitizeName(name);

  if (!safeName) {
    return res.status(400).json({ message: "Nome de página inválido." });
  }

  const parentDir = resolveSafePath(parentPath);

  if (!parentDir || !fs.existsSync(parentDir) || !fs.statSync(parentDir).isDirectory()) {
    return res.status(400).json({ message: "Pasta inválida." });
  }

  const filePath = path.join(parentDir, `${safeName}.md`);

  if (fs.existsSync(filePath)) {
    return res.status(409).json({ message: "Já existe uma página com esse nome nessa pasta." });
  }

  const initialContent = typeof content === "string" ? content : "";
  fs.writeFileSync(filePath, initialContent, "utf-8");

  const trimmedParent = String(parentPath ?? "").trim();
  const relPath = trimmedParent ? `${trimmedParent}/${safeName}` : safeName;

  res.status(201).json({ path: relPath, name: safeName, content: initialContent });
});

router.put("/pages/*", requireAdmin, (req, res) => {
  const relPath = req.params[0];
  const filePath = resolveSafePath(relPath);
  const { content } = req.body ?? {};

  if (!filePath || typeof content !== "string") {
    return res.status(400).json({ message: "Conteúdo inválido." });
  }

  const fullPath = `${filePath}.md`;

  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return res.status(404).json({ message: "Página não encontrada." });
  }

  fs.writeFileSync(fullPath, content, "utf-8");
  res.json({ path: relPath, name: path.basename(relPath), content });
});

router.delete("/pages/*", requireAdmin, (req, res) => {
  const relPath = req.params[0];
  const filePath = resolveSafePath(relPath);
  const fullPath = filePath ? `${filePath}.md` : null;

  if (!fullPath || !fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return res.status(404).json({ message: "Página não encontrada." });
  }

  fs.unlinkSync(fullPath);
  res.status(204).send();
});

router.post("/folders", requireAdmin, (req, res) => {
  const { parentPath, name } = req.body ?? {};
  const safeName = sanitizeName(name);

  if (!safeName) {
    return res.status(400).json({ message: "Nome de pasta inválido." });
  }

  const parentDir = resolveSafePath(parentPath);

  if (!parentDir || !fs.existsSync(parentDir) || !fs.statSync(parentDir).isDirectory()) {
    return res.status(400).json({ message: "Pasta pai inválida." });
  }

  const folderPath = path.join(parentDir, safeName);

  if (fs.existsSync(folderPath)) {
    return res.status(409).json({ message: "Já existe uma pasta com esse nome aqui." });
  }

  fs.mkdirSync(folderPath);

  const trimmedParent = String(parentPath ?? "").trim();
  const relPath = trimmedParent ? `${trimmedParent}/${safeName}` : safeName;

  res.status(201).json({ path: relPath, name: safeName, type: "folder", children: [] });
});

router.delete("/folders/*", requireAdmin, (req, res) => {
  const relPath = req.params[0];

  if (!relPath) {
    return res.status(400).json({ message: "Não é possível remover a raiz da wiki." });
  }

  const folderPath = resolveSafePath(relPath);

  if (!folderPath || !fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    return res.status(404).json({ message: "Pasta não encontrada." });
  }

  fs.rmSync(folderPath, { recursive: true, force: true });
  res.status(204).send();
});

export default router;
