import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listShowsForSeller } from "@/lib/live";
import LogoutButton from "@/components/dashboard/logout-button";
import NewShowForm from "./new-show-form";
import ShopInfoForm from "./shop-info-form";

export const metadata = { title: "Your shows · Live Drop" };
export const dynamic = "force-dynamic";

export default async function StudioHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/studio");
  const shows = listShowsForSeller(user.id);

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#0b0d12]">
      <header className="h-14 px-6 flex items-center justify-between bg-white border-b border-black/5">
        <Link href="/" className="font-extrabold">🔴 Live Drop</Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-black/60 hidden sm:inline">{user.name}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold">Your shows</h1>
          <p className="text-black/60 text-sm">Create a show, go live, and hold items up to the camera. Live Drop does the rest.</p>
        </div>
        <NewShowForm />
        <ShopInfoForm />
        <ul className="space-y-2">
          {shows.map((s) => (
            <li key={s.id} className="bg-white rounded-2xl border border-black/5 p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold truncate">{s.title}</p>
                <p className="text-xs text-black/50">
                  {s.status === "live" ? "🔴 Live now" : s.status === "ended" ? "Ended" : "Not started"} · shipping ${(s.shipping_cents / 100).toFixed(2)}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href={`/live/${s.id}`} className="h-9 px-3 rounded-full border border-black/10 text-sm grid place-items-center">Viewer page</Link>
                <Link href={`/studio/${s.id}`} className="h-9 px-4 rounded-full bg-black text-white text-sm font-semibold grid place-items-center">Open studio</Link>
              </div>
            </li>
          ))}
          {shows.length === 0 && <li className="text-sm text-black/50">No shows yet. Create your first one above.</li>}
        </ul>
      </main>
    </div>
  );
}
