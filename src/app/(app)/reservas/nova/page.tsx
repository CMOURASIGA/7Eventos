import { redirect } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import { Card, CardHeader, Field, Input, Select, Textarea, Banner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/Breadcrumb";
import { createReservation } from "../actions";

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; spaceId?: string; eventId?: string }>;
}) {
  const session = await requireAuthSession();
  if (!can(session.perfil, "manage_reservations")) redirect("/reservas/buscar?negado=1");
  const repository = getRepository();
  const { error, spaceId, eventId } = await searchParams;
  const spaces = await repository.spaces.list(session, { status: "ativo" });

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader
        breadcrumb={[{ label: "Reservas", href: "/reservas/buscar" }, { label: "Reserva rápida" }]}
        backHref={eventId ? `/eventos/${eventId}` : "/reservas/buscar"}
        title="Reserva rápida"
        description="Reserve um espaço sem precisar preencher o cadastro completo de um evento. Se quiser, você pode vincular esta reserva a um evento depois, sem digitar os dados de novo."
      />

      {error && <Banner tone="danger">{error}</Banner>}

      <Card>
        <CardHeader title="Dados da reserva" />
        <form action={createReservation} className="p-5 space-y-4">
          <input type="hidden" name="redirectTo" value="/reservas/nova" />
          {eventId && <input type="hidden" name="eventId" value={eventId} />}

          <Field label="Espaço" htmlFor="spaceId" required>
            <Select id="spaceId" name="spaceId" required defaultValue={spaceId ?? ""}>
              <option value="" disabled>
                Selecione um espaço
              </option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} — {s.local} (cap. {s.capacidade})
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Início" htmlFor="inicio" required>
              <Input id="inicio" name="inicio" type="datetime-local" required />
            </Field>
            <Field label="Fim" htmlFor="fim" required>
              <Input id="fim" name="fim" type="datetime-local" required />
            </Field>
          </div>

          <Field label="Quantidade de pessoas" htmlFor="quantidadePessoas" hint="Usada para validar a capacidade do espaço">
            <Input id="quantidadePessoas" name="quantidadePessoas" type="number" min={1} />
          </Field>

          <Field label="Motivo" htmlFor="motivo" required>
            <Textarea id="motivo" name="motivo" required maxLength={300} />
          </Field>

          <div className="flex justify-end pt-2">
            <Button type="submit">Confirmar reserva</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
