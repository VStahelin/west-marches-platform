import { verifyToken } from "../jwt.js";

function extractToken(authHeader) {
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

export function optionalAuth(req, res, next) {
  const token = extractToken(req.headers.authorization);
  req.user = token ? verifyToken(token) : null;
  next();
}

export function requireAuth(req, res, next) {
  const token = extractToken(req.headers.authorization);
  const user = token ? verifyToken(token) : null;

  if (!user?.username) {
    return res.status(401).json({ message: "Não autenticado." });
  }

  req.user = user;
  next();
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Apenas administradores podem fazer isso." });
    }

    next();
  });
}
