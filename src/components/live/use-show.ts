"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LiveItem = {
  id: string;
  seq: number;
  title: string;
  size: string | null;
  condition: string | null;
  description: string | null;
  price_cents: number;
  status: "draft" | "listed" | "claimed" | "paid" | "on_hold" | "shipped" | "refunded";
  image_data: string | null;
  retail_hint: string | null;
  retail_cents: number | null;
  auction_ends_at: number | null;
  auction_start_cents: number | null;
  auction_closed: number;
  top_bid_cents: number | null;
  top_bidder: string | null;
  bid_count: number;
  retail_sources: string | null; // JSON: [{ title, brand, store, price_cents }]
  ai_status: "pending" | "done" | "failed" | "off";
  winner_name: string | null;
  waiting_count: number;
  listed_at: number | null;
  created_at: number;
};

export type ChatMessage = {
  id: string;
  name: string;
  text: string;
  kind: "claim" | "bid" | "question" | "other" | "pending";
  item_id: string | null;
  created_at: number;
};

export type Bag = {
  lines: {
    item_id: string;
    title: string;
    size: string | null;
    price_cents: number;
    status: string; // won | paid | on_hold (bought by your agent, undo still possible)
    pay_by: number | null;
    order_id?: string | null;
    undo_until?: number | null;
  }[];
  waiting: { item_id: string; title: string; position: number }[];
  shipping_cents: number;
};

export type Toast = { id: number; text: string; tone: "paid" | "claim" | "info" };

type Snapshot = {
  show: { id: string; title: string; status: "scheduled" | "live" | "ended"; shipping_cents: number; claim_minutes: number };
  items: LiveItem[];
  messages: ChatMessage[];
  bag: Bag | null;
  viewer: { id: string; name: string } | null;
  totals: { item_cents: number; shipping_cents: number; orders: number } | null; // seller only
};

// "You save 80%" against the typical price of similar new items.
export function savings(item: Pick<LiveItem, "price_cents" | "retail_cents">): number | null {
  if (!item.retail_cents || item.price_cents <= 0 || item.price_cents >= item.retail_cents) return null;
  return Math.round((1 - item.price_cents / item.retail_cents) * 100);
}

export const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

// Loads a show, then keeps it up to date from the server's live event stream.
export function useShow(showId: string) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  // Bumped when the viewer joins, so the live connection reopens knowing who they are.
  const [epoch, setEpoch] = useState(0);
  const rejoin = useCallback(() => setEpoch((e) => e + 1), []);

  const pushToast = useCallback((text: string, tone: Toast["tone"]) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/shows/${showId}`, { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) setError(body.error || "Could not load the show.");
    else setSnap(body);
  }, [showId]);

  const refreshBag = useCallback(async () => {
    const res = await fetch(`/api/shows/${showId}`, { cache: "no-store" });
    if (res.ok) {
      const body = (await res.json()) as Snapshot;
      setSnap((s) => (s ? { ...s, bag: body.bag, viewer: body.viewer, totals: body.totals } : body));
    }
  }, [showId]);

  useEffect(() => {
    let active = true;
    fetch(`/api/shows/${showId}`, { cache: "no-store" }).then(async (res) => {
      const body = await res.json();
      if (!active) return;
      if (!res.ok) setError(body.error || "Could not load the show.");
      else setSnap(body);
    });
    const source = new EventSource(`/api/shows/${showId}/events`);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (e) => {
      const event = JSON.parse(e.data);
      switch (event.type) {
        case "item":
          setSnap((s) => {
            if (!s) return s;
            const exists = s.items.some((i) => i.id === event.item.id);
            const items = exists ? s.items.map((i) => (i.id === event.item.id ? event.item : i)) : [...s.items, event.item];
            return { ...s, items };
          });
          break;
        case "message":
          setSnap((s) => {
            if (!s) return s;
            const exists = s.messages.some((m) => m.id === event.message.id);
            const messages = exists
              ? s.messages.map((m) => (m.id === event.message.id ? event.message : m))
              : [...s.messages.slice(-99), event.message];
            return { ...s, messages };
          });
          break;
        case "claim":
          if (event.status === "won") pushToast(`🙋 ${event.name} claimed it!`, "claim");
          break;
        case "paid":
          pushToast(`✅ ${event.name} paid ${money(event.total_cents)} with PayPal`, "paid");
          void refreshBag(); // also refreshes the seller's totals
          break;
        case "auction_started":
          pushToast(`⚡ Flash auction: ${event.title}! Type your bid in the chat`, "claim");
          break;
        case "auction_ended":
          pushToast(event.winner ? `⚡ Sold to ${event.winner} for ${money(event.amount_cents)}` : `⚡ No bids on ${event.title}`, event.winner ? "claim" : "info");
          break;
        case "bid_too_low":
          pushToast(`Bid at least ${money(event.minimum_cents)}`, "info");
          break;
        case "agent_bought":
          pushToast(`🤖 ${event.name}'s agent bought ${event.title}`, "claim");
          break;
        case "agent_undone":
          pushToast(`↩️ ${event.name} undid an agent purchase`, "info");
          break;
        case "released":
          pushToast(
            event.to ? `⏱️ ${event.from} didn't pay in time. ${event.title} goes to ${event.to}` : `⏱️ ${event.title} is up for grabs again`,
            "info",
          );
          break;
        case "bag":
          void refreshBag();
          break;
        case "show":
          setSnap((s) => (s ? { ...s, show: { ...s.show, status: event.status } } : s));
          break;
        case "presence":
          setViewers(event.viewers);
          break;
      }
    };
    return () => {
      active = false;
      source.close();
    };
  }, [showId, refreshBag, pushToast, epoch]);

  return { snap, setSnap, error, connected, viewers, toasts, pushToast, reload, refreshBag, rejoin };
}
