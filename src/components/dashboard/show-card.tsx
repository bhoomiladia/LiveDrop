import Link from "next/link";
import type { PublicShow } from "@/lib/live";
import { IconEye } from "@/components/ui/icons";
import { Badge, LiveBadge, Thumb, money } from "@/components/ui/kit";

// A show in the buyer's browse lists: what's on screen now, who's selling, how many are watching.
export default function ShowCard({ show }: { show: PublicShow }) {
  const live = show.status === "live";
  const item = show.now_showing;
  return (
    <Link href={`/live/${show.id}`} className="group block bg-paper rounded-[10px] border border-line overflow-hidden hover:border-line-strong transition-colors">
      <div className="relative aspect-[4/3] bg-canvas">
        <Thumb src={item?.image_data} className="absolute inset-0 w-full h-full rounded-none border-0" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {live ? <LiveBadge /> : <Badge tone="neutral">{show.status === "scheduled" ? "Starting soon" : "Ended"}</Badge>}
        </div>
        {live && show.watching > 0 && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 h-[22px] px-2 rounded-[4px] bg-ink/75 text-paper text-[11px] tabular-nums">
            <IconEye size={13} /> {show.watching}
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="font-medium truncate group-hover:text-ember transition-colors">{show.title}</p>
        <p className="text-[13px] text-muted mt-0.5">by {show.seller_name}</p>
        <p className="text-[13px] mt-3 truncate">
          {live && item ? (
            <>
              <span className="text-muted">On now:</span> {item.title} <span className="font-medium">{money(item.price_cents)}</span>
            </>
          ) : show.status === "scheduled" ? (
            <span className="text-muted">Open it now to be ready when it starts.</span>
          ) : (
            <span className="text-muted">
              {show.sold_count} of {show.item_count} items sold
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
