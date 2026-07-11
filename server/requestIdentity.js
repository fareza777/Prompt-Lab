export function getRequestIdentity(req) {
  const userId = String(req.authUserId || "").trim();
  if (userId) return { kind: "user", value: userId };
  return { kind: "ip", value: String(req.ip || req.socket?.remoteAddress || "unknown") };
}
