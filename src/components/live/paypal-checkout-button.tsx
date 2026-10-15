"use client";

import { useEffect, useRef, useState } from "react";
import { loadCoreSdkScript } from "@paypal/paypal-js/sdk-v6";
import type { OnApproveDataOneTimePayments } from "@paypal/paypal-js/sdk-v6";

type Session = { start: (options: { presentationMode: "auto" }, order: Promise<{ orderId: string }>) => Promise<void> };

// PayPal's v6 web SDK: our own button starts a PayPal one-time payment session.
// The server creates the order (createOrder) and captures it after approval (onApproved).
export default function PayPalCheckoutButton({
  clientId,
  label,
  createOrder,
  onApproved,
  onError,
}: {
  clientId: string;
  label: string;
  createOrder: () => Promise<{ orderId: string }>;
  onApproved: (orderId: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const session = useRef<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  // Keep the latest callbacks without re-creating the PayPal session.
  const callbacks = useRef({ onApproved, onError });
  useEffect(() => {
    callbacks.current = { onApproved, onError };
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const paypal = await loadCoreSdkScript({ environment: "sandbox" });
        if (!paypal || cancelled) return;
        const sdk = await paypal.createInstance({ clientId, components: ["paypal-payments"], pageType: "checkout" });
        const eligibility = await sdk.findEligibleMethods({ currencyCode: "USD" });
        if (!eligibility.isEligible("paypal")) {
          callbacks.current.onError("PayPal isn't available for this browser.");
          return;
        }
        session.current = sdk.createPayPalOneTimePaymentSession({
          onApprove: async (data: OnApproveDataOneTimePayments) => {
            try {
              await callbacks.current.onApproved(data.orderId);
            } finally {
              setBusy(false);
            }
          },
          onCancel: () => setBusy(false),
          onError: (err) => {
            setBusy(false);
            callbacks.current.onError(err.message || "PayPal had a problem.");
          },
        }) as unknown as Session;
        if (!cancelled) setReady(true);
      } catch (err) {
        callbacks.current.onError(`Couldn't load PayPal: ${(err as Error).message}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function pay() {
    if (!session.current) return;
    setBusy(true);
    try {
      await session.current.start({ presentationMode: "auto" }, createOrder());
    } catch (err) {
      setBusy(false);
      callbacks.current.onError((err as Error).message || "Checkout failed.");
    }
  }

  return (
    <button
      type="button"
      onClick={pay}
      disabled={!ready || busy}
      className="w-full h-12 rounded-[5px] bg-[#ffc439] hover:bg-[#f2b630] disabled:opacity-60 text-[#111] font-semibold text-[15px] flex items-center justify-center gap-2 transition-colors"
    >
      {!ready ? "Loading PayPal…" : busy ? "Waiting for PayPal…" : (
        <>
          <span className="italic font-extrabold text-[#003087]">Pay</span>
          <span className="italic font-extrabold text-[#009cde] -ml-2">Pal</span>
          <span className="ml-1">{label}</span>
        </>
      )}
    </button>
  );
}
