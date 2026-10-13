import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getCurrentUser } from "./auth";
import { getShow, type ShowRow, type Viewer } from "./live";

// Viewers don't need an account: a cookie gives them a stable id and a display name.
const VIEWER_COOKIE = "ld_viewer";
const NAME_COOKIE = "ld_name";
const YEAR = 60 * 60 * 24 * 365;

export function cleanName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const n = name.replace(/[^\p{L}\p{N} ._'-]/gu, "").trim().slice(0, 24);
  return n.length >= 2 ? n : null;
}

export async function getViewer(): Promise<Viewer | null> {
  const store = await cookies();
  const id = store.get(VIEWER_COOKIE)?.value;
  const name = store.get(NAME_COOKIE)?.value;
  if (!id || !name) return null;
  return { id, name: decodeURIComponent(name) };
}

export async function setViewer(name: string): Promise<Viewer> {
  const store = await cookies();
  const id = store.get(VIEWER_COOKIE)?.value || crypto.randomUUID();
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: YEAR };
  store.set(VIEWER_COOKIE, id, opts);
  store.set(NAME_COOKIE, encodeURIComponent(name), opts);
  return { id, name };
}

// Returns the show only if the signed-in user is its seller.
export async function requireSeller(showId: string): Promise<{ show: ShowRow; userId: string } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const show = getShow(showId);
  if (!show || show.seller_id !== user.id) return null;
  return { show, userId: user.id };
}
