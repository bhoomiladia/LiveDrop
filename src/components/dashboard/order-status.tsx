import { Badge } from "@/components/ui/kit";

const ORDER: Record<string, [string, "success" | "warn" | "ember" | "neutral" | "outline"]> = {
  paid: ["Paid", "success"],
  on_hold: ["On hold", "warn"],
  partially_refunded: ["Part refunded", "neutral"],
  refunded: ["Refunded", "outline"],
  voided: ["Undone", "outline"],
};

export function OrderStatus({ status, shipped }: { status: string; shipped?: boolean }) {
  if (shipped && status === "paid") return <Badge tone="success">Shipped</Badge>;
  const [label, tone] = ORDER[status] ?? [status.replace(/_/g, " "), "neutral"];
  return <Badge tone={tone}>{label}</Badge>;
}

export const ORDER_KIND: Record<string, string> = { bag: "Live checkout", agent: "AI agent", invoice: "PayPal invoice" };
