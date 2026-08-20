import { notFound, redirect } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import { Banner } from "@/components/ui/primitives";
import { EventForm } from "../../EventForm";
import { updateEvent } from "../../actions";

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireAuthSession();
  if (!can(session.perfil, "create_edit_event")) redirect("/eventos");

  const repository = getRepository();
  const { id } = await params;
  const { error } = await searchParams;

  const event = await repository.events.get(session, id);
  if (!event) notFound();

  const [spaces, users] = await Promise.all([
    repository.spaces.list(session),
    repository.users.list(session),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Editar evento</h1>
        <p className="text-sm text-fg-muted">{event.titulo}</p>
      </div>
      {error && <Banner tone="danger">{error}</Banner>}
      <EventForm
        action={updateEvent.bind(null, id)}
        event={event}
        spaces={spaces}
        users={users}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
