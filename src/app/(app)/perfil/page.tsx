import { getCurrentUser, requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { ROLE_LABELS } from "@/lib/domain/types";
import { getDataMode } from "@/lib/data";
import { Card, CardHeader, Badge } from "@/components/ui/primitives";
import { logout } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import { notFound } from "next/navigation";

export default async function ProfilePage() {
  const session = await requireAuthSession();
  const user = await getCurrentUser();
  if (!user) notFound();

  const repository = getRepository();
  const company = session.companyId ? await repository.companies.get(session, session.companyId) : null;
  const mode = getDataMode();

  return (
    <div className="max-w-xl space-y-6">
      <div className="page-hero">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Perfil e sessão</h1>
        <p className="text-sm text-fg-muted">Informações da sua conta e da sessão atual.</p>
      </div>

      <Card>
        <CardHeader title="Usuário" />
        <div className="p-5 space-y-3 text-sm">
          <Row label="Nome" value={user.nome} />
          <Row label="E-mail" value={user.email} />
          <Row label="Perfil" value={<Badge tone="brand">{ROLE_LABELS[user.perfil]}</Badge>} />
          <Row label="Status" value={<Badge tone={user.status === "ativo" ? "success" : "neutral"}>{user.status}</Badge>} />
          <Row label="Empresa" value={company?.nomeFantasia ?? "—"} />
          <Row label="Usuário desde" value={formatDateTime(user.createdAt)} />
          <Row label="Fonte de dados" value={<Badge tone={mode === "mock" ? "warning" : "success"}>{mode === "mock" ? "Demonstração" : "Supabase (oficial)"}</Badge>} />
        </div>
      </Card>

      <form action={logout}>
        <Button type="submit" variant="secondary">
          Encerrar sessão
        </Button>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border-subtle pb-2 last:border-0">
      <span className="text-fg-muted">{label}</span>
      <span className="text-[var(--foreground)]">{value}</span>
    </div>
  );
}
