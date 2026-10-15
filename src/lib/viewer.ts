import "server-only";
import { getCurrentUser } from "./auth";
import { getShow, type ShowRow, type Viewer } from "./live";

// Buyers must be signed in to chat, claim, bid or pay: the buyer's account is their viewer identity.
// Sellers (and signed-out visitors) can watch, but have no viewer identity.
export async function getViewer(): Promise<Viewer | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "buyer") return null;
  return { id: user.id, name: user.name };
}

// Returns the show only if the signed-in user is its seller.
export async function requireSeller(showId: string): Promise<{ show: ShowRow; userId: string } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const show = getShow(showId);
  if (!show || show.seller_id !== user.id) return null;
  return { show, userId: user.id };
}
