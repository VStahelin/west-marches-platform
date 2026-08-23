export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Não autenticado." });
  }

  try {
    const user = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Apenas administradores podem fazer isso." });
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Token inválido." });
  }
}
