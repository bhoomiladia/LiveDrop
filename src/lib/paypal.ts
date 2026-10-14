import "server-only";
import crypto from "node:crypto";

// Thin server-side client for the PayPal REST APIs Live Drop uses.
// Sandbox only. Secrets never leave the server.

const BASE =
  process.env.PAYPAL_ENVIRONMENT === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

export function getPayPalClientId(): string {
  return process.env.PAYPAL_CLIENT_ID || "";
}

function getSecret(): string {
  // PAYPAL_SECRET is the older name, still accepted.
  return process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SECRET || "";
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${getPayPalClientId()}:${getSecret()}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const body = await res.json();
  if (!res.ok) throw new PayPalError(res.status, body.error || "AUTH_FAILED", body.error_description || "PayPal login failed");
  cachedToken = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return cachedToken.value;
}

export class PayPalError extends Error {
  constructor(public status: number, public name: string, message: string, public details?: unknown) {
    super(message);
  }
}

// Every money-moving call carries a PayPal-Request-Id so a retry can never charge twice.
async function paypal<T>(method: string, path: string, body?: unknown, requestId?: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(method !== "GET" ? { "PayPal-Request-Id": requestId || crypto.randomUUID() } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const issue = json.details?.[0]?.issue || json.details?.[0]?.description;
    throw new PayPalError(res.status, json.name || "PAYPAL_ERROR", issue || json.message || `PayPal ${res.status}`, json.details);
  }
  return json as T;
}

const usd = (cents: number) => ({ currency_code: "USD", value: (cents / 100).toFixed(2) });

export type BagLine = { name: string; priceCents: number; sku?: string };

type OrderResponse = {
  id: string;
  status: string;
  links?: { rel: string; href: string }[];
  purchase_units?: {
    payments?: {
      captures?: { id: string; status: string; amount: { value: string } }[];
      authorizations?: { id: string; status: string; amount: { value: string } }[];
    };
  }[];
};

// Checkout for a buyer's bag: items plus one shipping fee.
export function createBagOrder(opts: {
  lines: BagLine[];
  shippingCents: number;
  referenceId: string;
  description: string;
  requestId: string;
}): Promise<OrderResponse> {
  const itemTotal = opts.lines.reduce((s, l) => s + l.priceCents, 0);
  return paypal<OrderResponse>(
    "POST",
    "/v2/checkout/orders",
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: opts.referenceId,
          description: opts.description.slice(0, 127),
          amount: {
            ...usd(itemTotal + opts.shippingCents),
            breakdown: { item_total: usd(itemTotal), shipping: usd(opts.shippingCents) },
          },
          items: opts.lines.map((l) => ({
            name: l.name.slice(0, 127),
            quantity: "1",
            unit_amount: usd(l.priceCents),
            ...(l.sku ? { sku: l.sku } : {}),
          })),
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Live Drop",
            user_action: "PAY_NOW",
            shipping_preference: "GET_FROM_FILE",
          },
        },
      },
    },
    opts.requestId,
  );
}

export function getOrder(orderId: string): Promise<OrderResponse> {
  return paypal<OrderResponse>("GET", `/v2/checkout/orders/${encodeURIComponent(orderId)}`);
}

export function captureOrder(orderId: string, requestId: string): Promise<OrderResponse> {
  return paypal<OrderResponse>("POST", `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {}, requestId);
}

// Agent purchase: saved PayPal, buyer not present, money on hold.
export function createVaultedHoldOrder(opts: {
  vaultId: string;
  line: BagLine;
  shippingCents: number;
  referenceId: string;
  requestId: string;
}): Promise<OrderResponse> {
  return paypal<OrderResponse>(
    "POST",
    "/v2/checkout/orders",
    {
      intent: "AUTHORIZE",
      purchase_units: [
        {
          reference_id: opts.referenceId,
          description: `Agent purchase: ${opts.line.name}`.slice(0, 127),
          amount: {
            ...usd(opts.line.priceCents + opts.shippingCents),
            breakdown: { item_total: usd(opts.line.priceCents), shipping: usd(opts.shippingCents) },
          },
          items: [{ name: opts.line.name.slice(0, 127), quantity: "1", unit_amount: usd(opts.line.priceCents) }],
        },
      ],
      payment_source: { paypal: { vault_id: opts.vaultId } },
    },
    opts.requestId,
  );
}

export function voidAuthorization(authorizationId: string, requestId: string) {
  return paypal<Record<string, never>>("POST", `/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/void`, {}, requestId);
}

export function captureAuthorization(authorizationId: string, requestId: string) {
  return paypal<{ id: string; status: string }>(
    "POST",
    `/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/capture`,
    { final_capture: true },
    requestId,
  );
}

export function refundCapture(captureId: string, amountCents: number | null, note: string, requestId: string) {
  return paypal<{ id: string; status: string }>(
    "POST",
    `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,
    { ...(amountCents !== null ? { amount: usd(amountCents) } : {}), note_to_payer: note.slice(0, 255) },
    requestId,
  );
}

const KNOWN_CARRIERS = new Set(["USPS", "UPS", "FEDEX", "DHL", "DHL_API", "ONTRAC", "LASERSHIP", "CANADA_POST", "ROYAL_MAIL", "AUSTRALIA_POST"]);

export function addTracking(orderId: string, captureId: string, trackingNumber: string, carrier: string, requestId: string) {
  const code = carrier.toUpperCase().replace(/[^A-Z]/g, "_");
  const carrierFields = KNOWN_CARRIERS.has(code) ? { carrier: code } : { carrier: "OTHER", carrier_name_other: carrier.slice(0, 64) };
  return paypal<OrderResponse>(
    "POST",
    `/v2/checkout/orders/${encodeURIComponent(orderId)}/track`,
    { capture_id: captureId, tracking_number: trackingNumber, ...carrierFields, notify_payer: true },
    requestId,
  );
}

// ---- Invoicing: one invoice per buyer after the show ----

type Invoice = {
  id: string;
  status: string; // DRAFT | UNPAID | SENT | PAID | MARKED_AS_PAID | CANCELLED | ...
  detail?: { metadata?: { recipient_view_url?: string } };
  payments?: { transactions?: { payment_id?: string; amount?: { value: string } }[] };
};

export async function createInvoice(opts: { lines: BagLine[]; shippingCents: number; note: string; reference: string }) {
  const created = await paypal<{ id?: string; href?: string }>(
    "POST",
    "/v2/invoicing/invoices",
    {
      detail: {
        currency_code: "USD",
        reference: opts.reference.slice(0, 120),
        note: opts.note.slice(0, 4000),
        payment_term: { term_type: "DUE_ON_RECEIPT" },
      },
      items: opts.lines.map((l) => ({ name: l.name.slice(0, 200), quantity: "1", unit_amount: usd(l.priceCents) })),
      amount: { breakdown: { shipping: { amount: usd(opts.shippingCents) } } },
    },
    `inv-${opts.reference}`,
  );
  const id = created.id || created.href?.split("/").pop();
  if (!id) throw new PayPalError(500, "INVOICE_ERROR", "PayPal didn't return an invoice id");
  // Our buyers join with just a name, so PayPal doesn't email them: we show the link and a QR code.
  await paypal("POST", `/v2/invoicing/invoices/${encodeURIComponent(id)}/send`, { send_to_recipient: false, send_to_invoicer: false }, `send-${opts.reference}`);
  return getInvoice(id);
}

export function getInvoice(id: string): Promise<Invoice> {
  return paypal<Invoice>("GET", `/v2/invoicing/invoices/${encodeURIComponent(id)}`);
}

export async function cancelInvoice(id: string) {
  await paypal("POST", `/v2/invoicing/invoices/${encodeURIComponent(id)}/cancel`, { send_to_recipient: false, send_to_invoicer: false });
}

// PayPal returns the QR image as base64 inside a multipart body.
export async function invoiceQrDataUrl(id: string): Promise<string | null> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}/v2/invoicing/invoices/${encodeURIComponent(id)}/generate-qr-code`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ width: 240, height: 240 }),
  });
  if (!res.ok) return null;
  const text = await res.text();
  const base64 = text.match(/\r?\n\r?\n([A-Za-z0-9+/=\r\n]{100,})/)?.[1]?.replace(/\s+/g, "");
  return base64 ? `data:image/png;base64,${base64}` : null;
}

// ---- Transaction Search: PayPal's own record of payments (bookkeeping) ----

export async function searchTransactions(from: Date, to: Date): Promise<{ id: string; amount: number; fee: number; status: string; date: string }[]> {
  const out: { id: string; amount: number; fee: number; status: string; date: string }[] = [];
  const fmt = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "-0000");
  // The API allows at most 31 days per request.
  for (let start = from.getTime(); start < to.getTime(); start += 31 * 86_400_000) {
    const end = Math.min(start + 31 * 86_400_000 - 1000, to.getTime());
    let page = 1;
    for (;;) {
      const res = await paypal<{
        transaction_details?: { transaction_info: { transaction_id: string; transaction_amount?: { value: string }; fee_amount?: { value: string }; transaction_status?: string; transaction_initiation_date?: string } }[];
        total_pages?: number;
      }>("GET", `/v1/reporting/transactions?start_date=${encodeURIComponent(fmt(new Date(start)))}&end_date=${encodeURIComponent(fmt(new Date(end)))}&fields=transaction_info&page_size=500&page=${page}`);
      for (const d of res.transaction_details ?? []) {
        const t = d.transaction_info;
        out.push({
          id: t.transaction_id,
          amount: Number(t.transaction_amount?.value ?? 0),
          fee: Number(t.fee_amount?.value ?? 0),
          status: t.transaction_status ?? "",
          date: t.transaction_initiation_date ?? "",
        });
      }
      if (!res.total_pages || page >= res.total_pages) break;
      page++;
    }
  }
  return out;
}

// ---- Vault: save PayPal for an agent ----

export function createSetupToken(returnUrl: string, cancelUrl: string) {
  return paypal<{ id: string; links?: { rel: string; href: string }[] }>("POST", "/v3/vault/setup-tokens", {
    payment_source: {
      paypal: {
        usage_type: "MERCHANT",
        experience_context: { brand_name: "Live Drop", return_url: returnUrl, cancel_url: cancelUrl, vault_instruction: "ON_PAYER_APPROVAL" },
      },
    },
  });
}

export function createPaymentToken(setupTokenId: string) {
  return paypal<{ id: string; customer?: { id: string } }>("POST", "/v3/vault/payment-tokens", {
    payment_source: { token: { id: setupTokenId, type: "SETUP_TOKEN" } },
  });
}

export function deletePaymentToken(vaultId: string) {
  return paypal<Record<string, never>>("DELETE", `/v3/vault/payment-tokens/${encodeURIComponent(vaultId)}`);
}

// ---- Webhooks ----

export async function verifyWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const result = await paypal<{ verification_status: string }>("POST", "/v1/notifications/verify-webhook-signature", {
    auth_algo: headers.get("paypal-auth-algo"),
    cert_url: headers.get("paypal-cert-url"),
    transmission_id: headers.get("paypal-transmission-id"),
    transmission_sig: headers.get("paypal-transmission-sig"),
    transmission_time: headers.get("paypal-transmission-time"),
    webhook_id: webhookId,
    webhook_event: JSON.parse(rawBody),
  });
  return result.verification_status === "SUCCESS";
}

export function firstCapture(order: OrderResponse) {
  return order.purchase_units?.[0]?.payments?.captures?.[0];
}

export function firstAuthorization(order: OrderResponse) {
  return order.purchase_units?.[0]?.payments?.authorizations?.[0];
}
