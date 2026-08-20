import { redirect } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import { Banner } from "@/components/ui/primitives";
import { EventForm } from "../EventForm";
import { createEvent } from "../actions";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireAuthSession();
  if (!can(session.perfil, "create_edit_event")) redirect("/eventos");
  const repository = getRepository();
  const { error } = await searchParams;

  const [spaces, users] = await Promise.all([
    repository.spaces.list(session, { status: "ativo" }),
    repository.users.list(session),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Novo evento</h1>
        <p className="text-sm text-fg-muted">
          Após salvar, você poderá gerenciar reservas, checklist, orçamento e complexidade no detalhe do evento.
        </p>
      </div>
      {error && <Banner tone="danger">{error}</Banner>}
      <EventForm action={createEvent} spaces={spaces} users={users} submitLabel="Criar evento" includeSessionFields />
    </div>
  );
}
