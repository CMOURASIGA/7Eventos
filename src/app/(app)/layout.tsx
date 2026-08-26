import { redirect } from "next/navigation";
import { requireAuthSession, getCurrentUser } from "@/lib/auth/session";
import { getRepository, getDataMode } from "@/lib/data";
import { AppChrome } from "@/components/layout/AppChrome";
import { withDemoBrandingOverride } from "@/lib/branding-server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthSession();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const repository = getRepository();
  const storedCompany = session.companyId ? await repository.companies.get(session, session.companyId) : null;
  const company = await withDemoBrandingOverride(storedCompany);
  const isDemo = getDataMode() === "mock";

  return (
    <AppChrome role={user.perfil} user={user} company={company} isDemo={isDemo}>
      {children}
    </AppChrome>
  );
}
