import "server-only";
import { cookies } from "next/headers";
import { verifySessionToken, ADMIN_COOKIE } from "./session";

export { ADMIN_COOKIE };

/** True if the current request carries a valid admin session cookie. */
export async function isAdmin(): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!token && (await verifySessionToken(secret, token));
}

/** Defense-in-depth: every admin Server Action calls this before mutating. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}
