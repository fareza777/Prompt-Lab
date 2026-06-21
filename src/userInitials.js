export function getUserInitials(account = {}) {
  const name = String(account.name || "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  const email = String(account.email || "").trim();
  if (email) return email.slice(0, 2).toUpperCase();
  return "PL";
}
