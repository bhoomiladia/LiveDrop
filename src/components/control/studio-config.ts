import type { AgDataSourcesDefinition, AgFieldDefinition, AgFormat, AgPageState, AgRelationDefinition, AgReportState, AgWidgetLayoutState } from "ag-studio";
import type { ControlData } from "@/lib/control-data";

// AG Studio setup for the seller's control room: the data tables, how they relate,
// and a ready-made "Show recap" report so the dashboard is useful on first load.

type FieldSpec = [id: string, name: string, format: AgFormat, hide?: boolean];
const fields = (specs: FieldSpec[]): AgFieldDefinition[] => specs.map(([id, name, format, hide]) => ({ id, name, format, ...(hide && { hide }) }));
const manyToOne = (id: string, source: string, target: string): AgRelationDefinition => {
  const [sourceTable, sourceField] = source.split(".");
  const [targetTable, targetField] = target.split(".");
  return { id, source: { tableId: sourceTable, fieldId: sourceField }, target: { tableId: targetTable, fieldId: targetField }, type: "many-to-one" };
};
const CALENDAR = "calendar";

export function buildStudioData(data: ControlData): AgDataSourcesDefinition {
  const dates = [...data.items.map((i) => i.listedAt), ...data.orders.map((o) => o.createdAt)].filter((d): d is string => !!d).sort();
  const today = data.asOf.slice(0, 10);
  return {
    description:
      "A seller's Live Drop activity. Live Drop is a live-video shopping app: the seller shows items on camera, viewers claim them in chat " +
      "(first claim wins), and pay with PayPal. Items can also be bought by AI shopping agents, won in flash auctions, or paid by PayPal invoice after the show. " +
      "All money is USD (PayPal sandbox).",
    sources: [
      {
        id: "shows",
        description: "One row per live show.",
        data: data.shows,
        fields: fields([
          ["id", "Show ID", "textFormat", true],
          ["title", "Show", "textFormat"],
          ["status", "Show Status", "textFormat"],
          ["startedAt", "Show Date", "dateTimeFormat"],
          ["endedAt", "Ended At", "dateTimeFormat", true],
        ]),
      },
      {
        id: "items",
        description:
          "One row per item put live. 'Sold' is 1 when paid (or held by an AI agent). 'Store price' is a conservative price for similar new items from Channel3. " +
          "'Minutes to claim' is how fast the first claim came after the item went live. 'Category' comes from the AI listing builder (older items may be Uncategorized).",
        data: data.items,
        fields: fields([
          ["id", "Item ID", "textFormat", true],
          ["showId", "Show ID", "textFormat", true],
          ["show", "Item Show", "textFormat"],
          ["seq", "Item #", "integerFormat"],
          ["title", "Item", "textFormat"],
          ["category", "Category", "textFormat"],
          ["size", "Size", "textFormat"],
          ["condition", "Condition", "textFormat"],
          ["price", "Price", "currencyFormat"],
          ["storePrice", "Store Price (new)", "currencyFormat"],
          ["status", "Item Status", "textFormat"],
          ["sold", "Sold", "integerFormat"],
          ["saleType", "Sold Via", "textFormat"],
          ["buyer", "Buyer", "textFormat"],
          ["bids", "Bids", "integerFormat"],
          ["claims", "Claims", "integerFormat"],
          ["listedAt", "Listed At", "dateTimeFormat"],
          ["minutesToClaim", "Minutes to Claim", "decimalFormat"],
        ]),
      },
      {
        id: "orders",
        description: "One row per PayPal payment. 'Collected' is items + shipping - refunds (0 while an agent purchase is still in its undo window).",
        data: data.orders,
        fields: fields([
          ["id", "Order ID", "textFormat", true],
          ["showId", "Show ID", "textFormat", true],
          ["show", "Order Show", "textFormat"],
          ["buyer", "Order Buyer", "textFormat"],
          ["channel", "Paid Via", "textFormat"],
          ["status", "Order Status", "textFormat"],
          ["itemsTotal", "Items Total", "currencyFormat"],
          ["shipping", "Shipping", "currencyFormat"],
          ["refunded", "Refunded", "currencyFormat"],
          ["collected", "Collected", "currencyFormat"],
          ["shipped", "Shipped", "textFormat"],
          ["createdAt", "Order Date", "dateTimeFormat"],
        ]),
      },
      {
        id: "claims",
        description: "Every claim on an item: who claimed, whether a person or an AI agent, and what happened (won, waiting, paid, released).",
        data: data.claims,
        fields: fields([
          ["id", "Claim ID", "textFormat", true],
          ["itemId", "Item ID", "textFormat", true],
          ["showId", "Show ID", "textFormat", true],
          ["buyer", "Claimed By", "textFormat"],
          ["who", "Person or Agent", "textFormat"],
          ["outcome", "Claim Outcome", "textFormat"],
          ["createdAt", "Claimed At", "dateTimeFormat"],
        ]),
      },
      {
        id: "chat",
        description: "Chat messages by kind: claims, bids, questions, shop-assistant answers (RAG), seller replies. 'Flagged' = the assistant asked the seller.",
        data: data.chat,
        fields: fields([
          ["id", "Message ID", "textFormat", true],
          ["showId", "Show ID", "textFormat", true],
          ["show", "Chat Show", "textFormat"],
          ["kind", "Message Kind", "textFormat"],
          ["flaggedForSeller", "Flagged for Seller", "textFormat"],
          ["createdAt", "Sent At", "dateTimeFormat"],
        ]),
      },
    ],
    relationships: [
      manyToOne("item-show", "items.showId", "shows.id"),
      manyToOne("order-show", "orders.showId", "shows.id"),
      manyToOne("claim-item", "claims.itemId", "items.id"),
      manyToOne("chat-show", "chat.showId", "shows.id"),
      { id: "orders-calendar", source: { tableId: "orders", fieldId: "createdAt" }, target: { calendarId: CALENDAR }, truncate: "day" },
      { id: "items-calendar", source: { tableId: "items", fieldId: "listedAt" }, target: { calendarId: CALENDAR }, truncate: "day" },
    ],
    calendars: [
      {
        id: CALENDAR,
        label: "Calendar",
        range: { from: { type: "date", value: (dates[0] ?? data.asOf).slice(0, 10) }, to: { type: "date", value: (dates.at(-1) ?? today).slice(0, 10) } },
        fragments: ["year", "month", "week", "day", "dayOfWeek"],
      },
    ],
  };
}

// ---- the ready-made report

const at = (xTrack: number, yTrack: number, xSpan: number, ySpan: number): AgWidgetLayoutState => ({ xTrack, yTrack, xSpan, ySpan });
const title = (text: string) => ({ title: { enabled: true, text } });
const sum = (id: string) => ({ id, aggregation: "sum" as const });
const avg = (id: string) => ({ id, aggregation: "avg" as const });
const countd = (id: string) => ({ id, aggregation: "countd" as const });
const kpi = (text: string, value: { id: string; aggregation?: "sum" | "avg" | "countd" }) => ({
  type: "value" as const,
  dataMapping: { value: [value] },
  format: { title: { enabled: true, text } },
});

const recap: AgPageState = {
  id: "recap",
  widgets: {
    "show-filter": { type: "button-filter", dataMapping: { value: [{ id: "shows.title" }] }, format: title("Show") },
    "kpi-listed": kpi("Items listed", countd("items.id")),
    "kpi-sold": kpi("Items sold", sum("items.sold")),
    "kpi-collected": kpi("Collected via PayPal", sum("orders.collected")),
    "kpi-speed": kpi("Avg minutes to first claim", avg("items.minutesToClaim")),
    "collected-by-show": {
      type: "column-chart-grouped",
      dataMapping: { categoryKey: [{ id: "shows.title" }], valueKey: [sum("orders.collected")] },
      format: title("Collected by show"),
    },
    "sold-via": {
      type: "donut-chart",
      dataMapping: { categoryKey: [{ id: "items.saleType" }], valueKey: [sum("items.sold")] },
      format: title("How items sold (incl. unsold)"),
    },
    items: {
      type: "grid",
      dataMapping: {
        cols: [
          { id: "items.show" },
          { id: "items.title" },
          { id: "items.category" },
          { id: "items.size" },
          sum("items.price"),
          sum("items.storePrice"),
          { id: "items.saleType" },
          { id: "items.buyer" },
          sum("items.minutesToClaim"),
          sum("items.claims"),
        ],
      },
      sort: [{ field: { id: "items.listedAt" }, direction: "desc" }],
      format: title("Every item"),
    },
    chat: {
      type: "bar-chart-grouped",
      dataMapping: { categoryKey: [{ id: "chat.kind" }], valueKey: [countd("chat.id")] },
      format: title("Chat activity"),
    },
  },
  widgetLayout: {
    "show-filter": at(0, 0, 24, 5),
    "kpi-listed": at(0, 5, 6, 7),
    "kpi-sold": at(6, 5, 6, 7),
    "kpi-collected": at(12, 5, 6, 7),
    "kpi-speed": at(18, 5, 6, 7),
    "collected-by-show": at(0, 12, 14, 18),
    "sold-via": at(14, 12, 10, 18),
    items: at(0, 30, 16, 24),
    chat: at(16, 30, 8, 24),
  },
};

const buyers: AgPageState = {
  id: "buyers",
  widgets: {
    "top-buyers": {
      type: "bar-chart-grouped",
      dataMapping: { categoryKey: [{ id: "orders.buyer" }], valueKey: [sum("orders.collected")] },
      format: title("Top buyers by amount collected"),
    },
    "paid-via": {
      type: "donut-chart",
      dataMapping: { categoryKey: [{ id: "orders.channel" }], valueKey: [sum("orders.collected")] },
      format: title("Collected by payment channel"),
    },
    "people-vs-agents": {
      type: "donut-chart",
      dataMapping: { categoryKey: [{ id: "claims.who" }], valueKey: [countd("claims.id")] },
      format: title("Claims: people vs AI agents"),
    },
    orders: {
      type: "grid",
      dataMapping: {
        cols: [
          { id: "orders.show" },
          { id: "orders.buyer" },
          { id: "orders.channel" },
          { id: "orders.status" },
          sum("orders.itemsTotal"),
          sum("orders.shipping"),
          sum("orders.refunded"),
          sum("orders.collected"),
          { id: "orders.shipped" },
        ],
      },
      sort: [{ field: { id: "orders.createdAt" }, direction: "desc" }],
      format: title("Orders"),
    },
  },
  widgetLayout: {
    "top-buyers": at(0, 0, 10, 20),
    "paid-via": at(10, 0, 7, 20),
    "people-vs-agents": at(17, 0, 7, 20),
    orders: at(0, 20, 24, 24),
  },
};

export const controlReport: AgReportState = { selectedPageId: recap.id, pages: [recap, buyers] };
export const PAGE_TITLES: Record<string, string> = { recap: "Show recap", buyers: "Buyers & orders" };
