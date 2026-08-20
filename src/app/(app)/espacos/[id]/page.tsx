import { notFound } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import { Card, CardHeader, Field, Input, Textarea, Badge, Banner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { updateSpace, setSpaceStatus } from "../actions";

export default async function SpaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const { id } = await params;
  const { error, updated } = await searchParams;

  const space = await repository.spaces.get(session, id);
  if (!space) notFound();

  const canManage = can(session.perfil, "manage_spaces");
  const updateAction = updateSpace.bind(null, id);

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-[var(--foreground)]">{space.nome}</h1>
            <Badge tone={space.status === "ativo" ? "success" : "neutral"}>
              {space.status === "ativo" ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          <p className="text-sm text-fg-muted">{space.local}</p>
        </div>
        {canManage && (
          <ConfirmButton
            variant={space.status === "ativo" ? "danger" : "secondary"}
            size="sm"
            title={space.status === "ativo" ? "Inativar espaço" : "Reativar espaço"}
            description={
              space.status === "ativo"
                ? "Espaços inativos não podem receber novas reservas. O histórico é preservado."
                : "O espaço voltará a aceitar novas reservas."
            }
            confirmLabel={space.status === "ativo" ? "Inativar" : "Reativar"}
            onConfirm={setSpaceStatus.bind(null, id, space.status === "ativo" ? "inativo" : "ativo")}
          >
            {space.status === "ativo" ? "Inativar espaço" : "Reativar espaço"}
          </ConfirmButton>
        )}
      </div>

      {error && <Banner tone="danger">{error}</Banner>}
      {updated === "1" && <Banner tone="success">Espaço atualizado com sucesso.</Banner>}

      <Card>
        <CardHeader title="Dados do espaço" />
        <form action={updateAction} className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome" htmlFor="nome" required>
              <Input id="nome" name="nome" defaultValue={space.nome} required disabled={!canManage} />
            </Field>
            <Field label="Local" htmlFor="local" required>
              <Input id="local" name="local" defaultValue={space.local} required disabled={!canManage} />
            </Field>
          </div>
          <Field label="Capacidade" htmlFor="capacidade" required>
            <Input
              id="capacidade"
              name="capacidade"
              type="number"
              min={0}
              defaultValue={space.capacidade}
              required
              disabled={!canManage}
            />
          </Field>
          <Field label="Descrição" htmlFor="descricao">
            <Textarea id="descricao" name="descricao" defaultValue={space.descricao} disabled={!canManage} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Características" htmlFor="caracteristicas" hint="Separe por vírgula">
              <Input
                id="caracteristicas"
                name="caracteristicas"
                defaultValue={space.caracteristicas.join(", ")}
                disabled={!canManage}
              />
            </Field>
            <Field label="Equipamentos" htmlFor="equipamentos" hint="Separe por vírgula">
              <Input
                id="equipamentos"
                name="equipamentos"
                defaultValue={space.equipamentos.join(", ")}
                disabled={!canManage}
              />
            </Field>
          </div>
          <Field label="Observações" htmlFor="observacoes">
            <Textarea id="observacoes" name="observacoes" defaultValue={space.observacoes} disabled={!canManage} />
          </Field>

          {canManage && (
            <div className="flex justify-end pt-2">
              <Button type="submit">Salvar alterações</Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
