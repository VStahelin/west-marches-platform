function decodeToken(authHeader) {
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const user = decodeToken(req.headers.authorization);

  if (!user?.username) {
    return res.status(401).json({ message: "Não autenticado." });
  }

  req.user = user;
  next();
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Apenas administradores podem fazer isso." });
    }

    next();
  });
}
