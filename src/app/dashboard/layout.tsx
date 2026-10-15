import AppShell from "@/components/dashboard/app-shell";
import { requireAccount } from "@/lib/guards";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireAccount("/dashboard");
  return (
    <AppShell role={user.role} user={{ name: user.name, email: user.email }}>
      {children}
    </AppShell>
  );
}
