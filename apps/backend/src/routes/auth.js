import { Router } from "express";

const router = Router();

// Autenticação provisória em memória, sem persistência ainda.
// O token é só um JSON em base64 (não assinado) até existir um fluxo real de auth.
router.post("/login", (req, res) => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ message: "Usuário e senha são obrigatórios." });
  }

  const role = username === "admin" ? "admin" : "player";
  const user = { username, role };
  const token = Buffer.from(JSON.stringify(user)).toString("base64");

  res.json({ token, user });
});

export default router;
