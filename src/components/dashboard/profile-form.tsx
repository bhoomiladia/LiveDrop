"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, CardHeader, Notice } from "@/components/ui/kit";
import { IdentityFields, PreferenceFields, ShowDefaultFields, type ProfileValues } from "./profile-fields";

export default function ProfileForm({ role, initial }: { role: "seller" | "buyer"; initial: ProfileValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setNote(null);
        const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
        const body = await res.json();
        setBusy(false);
        setNote(res.ok ? { tone: "success", text: "Profile saved." } : { tone: "error", text: body.error });
        if (res.ok) router.refresh();
      }}
    >
      <Card>
        <CardHeader title={role === "seller" ? "Shop profile" : "Your profile"} />
        <div className="px-5 pb-5">
          <IdentityFields role={role} values={values} onChange={setValues} />
        </div>
      </Card>
      <Card>
        <CardHeader
          title={role === "seller" ? "Show defaults" : "Shopping preferences"}
          description={role === "seller" ? "New shows start with these. You can change them per show." : "Used to pre-fill your AI agent."}
        />
        <div className="px-5 pb-5">
          {role === "seller" ? <ShowDefaultFields values={values} onChange={setValues} /> : <PreferenceFields values={values} onChange={setValues} />}
        </div>
      </Card>
      {note && <Notice tone={note.tone}>{note.text}</Notice>}
      <Button disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
    </form>
  );
}
