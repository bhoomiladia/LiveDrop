"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import BrandLogo from "@/components/brand/brand-logo";
import { IdentityFields, PreferenceFields, ShowDefaultFields, type ProfileValues } from "@/components/dashboard/profile-fields";
import ShopInfoForm from "@/components/dashboard/shop-info-form";
import RoleChoice from "@/components/auth/role-choice";
import { IconArrowLeft, IconArrowRight } from "@/components/ui/icons";
import { Button, Kicker, Notice, cx } from "@/components/ui/kit";

type Role = "seller" | "buyer";
type Step = "role" | "identity" | "details" | "shop";

const COPY: Record<Step, (role: Role | null) => { title: string; text: string }> = {
  role: () => ({ title: "How will you use Live Drop?", text: "Pick one. Seller and buyer accounts are separate, so this can't be changed later." }),
  identity: (r) =>
    r === "seller"
      ? { title: "Set up your shop", text: "This is how viewers will see you in your shows." }
      : { title: "Set up your profile", text: "This is the name sellers see when you claim an item." },
  details: (r) =>
    r === "seller"
      ? { title: "Defaults for your shows", text: "Every new show starts with these. You can change them per show." }
      : { title: "What do you shop for?", text: "Optional. We use this to pre-fill your AI shopping agent." },
  shop: () => ({
    title: "Teach your shop assistant",
    text: "Viewers' questions in chat are answered from this, with the source shown. You can skip this and add it later.",
  }),
};

export default function OnboardingFlow({ role: initialRole, email, initial, next }: { role: Role | null; email: string; initial: ProfileValues; next: string }) {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(initialRole);
  const steps: Step[] = [...(initialRole ? [] : (["role"] as Step[])), "identity", "details", ...(role === "buyer" ? [] : (["shop"] as Step[]))];
  const [step, setStep] = useState<Step>(steps[0]);
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const index = steps.indexOf(step);
  const copy = COPY[step](role);

  const finish = () => {
    router.push(next);
    router.refresh();
  };

  // Saves the profile and marks the account as set up (the role is fixed from here on).
  async function save() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, role, finish: true }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(body.error);
      return false;
    }
    return true;
  }

  async function onContinue(e: React.FormEvent) {
    e.preventDefault();
    if (step === "role") return role && setStep("identity");
    if (step === "identity") {
      if (values.name.trim().length < 2) return setErr("Enter your name (at least 2 characters).");
      if (role === "seller" && !values.shop_name.trim()) return setErr("Give your shop a name.");
      setErr(null);
      return setStep("details");
    }
    if (step === "details" && (await save())) {
      if (role === "seller") setStep("shop");
      else finish();
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <header className="h-16 px-5 sm:px-10 flex items-center justify-between bg-paper border-b border-line">
        <BrandLogo size="sm" />
        <span className="text-[13px] text-muted truncate ml-4">{email}</span>
      </header>

      <main className="flex-1 px-5 py-10 sm:py-16">
        <div className="max-w-[560px] mx-auto">
          <div className="flex items-center gap-1.5 mb-8" aria-label={`Step ${index + 1} of ${steps.length}`}>
            {steps.map((s, i) => (
              <span key={s} className={cx("h-1 flex-1 rounded-full transition-colors", i <= index ? "bg-ember" : "bg-line-strong")} />
            ))}
          </div>
          <Kicker>
            Step {index + 1} of {steps.length}
          </Kicker>
          <h1 className="mt-2 text-[32px] sm:text-[38px] font-[450] tracking-[-0.035em] leading-[1.05]">{copy.title}</h1>
          <p className="mt-3 text-[15px] text-muted leading-relaxed">{copy.text}</p>

          <div className="mt-8 bg-paper rounded-[10px] border border-line p-5 sm:p-6">
            {step === "shop" ? (
              <ShopInfoForm bare submitLabel="Save and finish" onSaved={finish} />
            ) : (
              <form onSubmit={onContinue} className="space-y-6">
                {step === "role" && <RoleChoice value={role} onChange={setRole} />}
                {step === "identity" && role && <IdentityFields role={role} values={values} onChange={setValues} />}
                {step === "details" && (role === "seller" ? <ShowDefaultFields values={values} onChange={setValues} /> : <PreferenceFields values={values} onChange={setValues} />)}
                {err && <Notice tone="error">{err}</Notice>}
                <div className="flex items-center justify-between gap-3 pt-1">
                  {index > 0 ? (
                    <Button type="button" variant="ghost" onClick={() => setStep(steps[index - 1])}>
                      <IconArrowLeft size={15} /> Back
                    </Button>
                  ) : (
                    <span />
                  )}
                  <Button disabled={busy || (step === "role" && !role)}>
                    {busy ? "Saving…" : step === "details" && role === "buyer" ? "Finish" : "Continue"} {!busy && <IconArrowRight size={15} />}
                  </Button>
                </div>
              </form>
            )}
          </div>
          {step === "shop" && (
            <button onClick={finish} className="mt-4 text-[13px] font-medium text-muted hover:text-ink">
              Skip for now
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
