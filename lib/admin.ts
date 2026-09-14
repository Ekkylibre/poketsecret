// Compte admin unique et permanent : pas de système de rôles, un seul admin prévu
// (voir conversation du 2026-09-14). Comparé par id (stable), jamais par pseudo
// (modifiable en base, contrairement à l'id qui ne change jamais).
const ADMIN_USER_ID = "ba21bc8d-d491-4b48-8125-cb766c086bc1";

export function isAdminUser(userId: string): boolean {
  return userId === ADMIN_USER_ID;
}
