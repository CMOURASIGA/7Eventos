import { redirect } from "next/navigation";
import { requireAuthSession, getCurrentUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthSession();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const repository = getRepository();
  const company = session.companyId ? await repository.companies.get(session, session.companyId) : null;

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar role={user.perfil} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} company={company} />
        <main className="flex-1 min-w-0 p-4 md:p-6 space-y-6">{children}</main>
      </div>
    </div>
  );
}
