import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { Card, CardHeader, Field, Input, Select, Banner } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/Breadcrumb";

interface SearchParams {
  spaceId?: string;
  inicio?: string;
  fim?: string;
  quantidadePessoas?: string;
  q?: string;
}

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const params = await searchParams;
  const spaces = await repository.spaces.list(session);
  const checked = params.q === "1" && params.spaceId && params.inicio && params.fim;

  const result = checked
    ? await repository.reservations.checkAvailability(session, {
        spaceId: params.spaceId!,
        inicio: new Date(params.inicio!).toISOString(),
        fim: new Date(params.fim!).toISOString(),
        quantidadePessoas: params.quantidadePessoas ? Number(params.quantidadePessoas) : undefined,
      })
    : null;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        breadcrumb={[{ label: "Reservas", href: "/reservas/buscar" }, { label: "Verificar disponibilidade" }]}
        backHref="/reservas/buscar"
        title="Verificar disponibilidade"
        description="Considera espaço, período, capacidade e reservas já existentes que possam conflitar."
      />

      <Card>
        <form className="p-5 space-y-4">
          <input type="hidden" name="q" value="1" />
          <Field label="Espaço" htmlFor="spaceId" required>
            <Select id="spaceId" name="spaceId" required defaultValue={params.spaceId ?? ""}>
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
              <Input id="inicio" name="inicio" type="datetime-local" required defaultValue={params.inicio} />
            </Field>
            <Field label="Fim" htmlFor="fim" required>
              <Input id="fim" name="fim" type="datetime-local" required defaultValue={params.fim} />
            </Field>
          </div>
          <Field label="Quantidade de pessoas" htmlFor="quantidadePessoas">
            <Input
              id="quantidadePessoas"
              name="quantidadePessoas"
              type="number"
              min={1}
              defaultValue={params.quantidadePessoas}
            />
          </Field>
          <Button type="submit">Verificar</Button>
        </form>
      </Card>

      {result && (
        <Card>
          <CardHeader title="Resultado" />
          <div className="p-5 space-y-3">
            {result.available ? (
              <Banner tone="success">Espaço disponível para o período informado.</Banner>
            ) : (
              <div className="space-y-2">
                {result.issues.map((issue, idx) => (
                  <Banner key={idx} tone="danger">
                    {issue.message}
                  </Banner>
                ))}
              </div>
            )}
            {result.available && (
              <ButtonLink
                href={`/reservas/nova?spaceId=${params.spaceId}`}
                size="sm"
              >
                Criar reserva para este período
              </ButtonLink>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
