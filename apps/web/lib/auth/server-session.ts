import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/auth/session";

/** Indique si une session viewer est présente (cookie JWT) — utilisable en RSC. */
export async function hasServerAccessToken(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!cookieStore.get(TOKEN_COOKIE)?.value;
}
