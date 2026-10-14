"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Show = {
  id: string;
  title: string;
  status: "scheduled" | "live" | "ended";
  seller_name: string;
  item_count: number;
  sold_count: number;
  watching: number;
  now_showing: { title: string; price_cents: number; image_data: string | null; status: string } | null;
};
type Shows = { live: Show[]; upcoming: Show[]; recent: Show[] };

const money = (c: number) => `$${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;

// Home page: shows that are live right now (refreshes itself), starting soon, and just ended.
export default function ShowsSection({ initial }: { initial: Shows }) {
  const [shows, setShows] = useState(initial);

  useEffect(() => {
    const t = setInterval(() => {
      fetch("/api/shows", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setShows(d));
    }, 15_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-8 text-left">
      <div>
        <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            {shows.live.length ? (
              <>
                <span className="inline-block w-3 h-3 rounded-full bg-red-600 animate-pulse mr-3 align-middle" />
                Live now
              </>
            ) : (
              "Nobody's live right now"
            )}
          </h2>
          <div className="flex gap-4">
            <Link href="/judge" className="text-sm font-semibold underline underline-offset-4 text-red-600">
              Judges: try it in 2 minutes →
            </Link>
            <Link href="/studio" className="text-sm font-semibold underline underline-offset-4">
              Go live yourself →
            </Link>
          </div>
        </div>
        {shows.live.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shows.live.map((s) => (
              <ShowCard key={s.id} show={s} />
            ))}
          </div>
        ) : (
          <p className="text-black/60">
            Shows appear here the moment a seller goes live. Want to try it? <Link href="/signup" className="underline">Create a seller account</Link>, go live, and open the viewer link in another window.
          </p>
        )}
      </div>

      {shows.upcoming.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-3">Starting soon</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shows.upcoming.map((s) => (
              <ShowCard key={s.id} show={s} />
            ))}
          </div>
        </div>
      )}

      {shows.recent.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-3">Recently ended</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shows.recent.map((s) => (
              <ShowCard key={s.id} show={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ShowCard({ show }: { show: Show }) {
  const live = show.status === "live";
  const item = show.now_showing;
  return (
    <Link
      href={`/live/${show.id}`}
      className={`group rounded-2xl overflow-hidden border bg-white flex shadow-sm hover:shadow-md transition-shadow ${live ? "border-red-200" : "border-black/10"}`}
    >
      <div className="w-28 shrink-0 bg-black/5 relative">
        {item?.image_data ? (
          <img src={item.image_data} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-3xl">{live ? "🔴" : "🛍️"}</div>
        )}
        {live && <span className="absolute top-2 left-2 text-[10px] font-bold bg-red-600 text-white rounded px-1.5 py-0.5">LIVE</span>}
      </div>
      <div className="p-3 min-w-0 flex-1">
        <p className="font-bold truncate group-hover:underline">{show.title}</p>
        <p className="text-xs text-black/50">
          by {show.seller_name}
          {live && show.watching > 0 ? ` · 👀 ${show.watching}` : ""}
        </p>
        {live && item ? (
          <p className="text-sm mt-2 truncate">
            On now: <b>{item.title}</b> · {money(item.price_cents)}
          </p>
        ) : (
          <p className="text-sm mt-2 text-black/60">
            {show.status === "scheduled" ? "Starting soon. Open it to be ready." : `${show.sold_count} of ${show.item_count} items sold`}
          </p>
        )}
        <p className={`text-xs font-semibold mt-2 ${live ? "text-red-600" : "text-black/50"}`}>{live ? "Watch & shop →" : "Open →"}</p>
      </div>
    </Link>
  );
}
