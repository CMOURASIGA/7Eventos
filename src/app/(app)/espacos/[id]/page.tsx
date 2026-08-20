import { notFound } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import { Card, CardHeader, Field, Input, Textarea, Badge, Banner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { PageHeader } from "@/components/layout/Breadcrumb";
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
      <PageHeader
        breadcrumb={[{ label: "Espaços", href: "/espacos" }, { label: space.nome }]}
        backHref="/espacos"
        title={
          <span className="flex items-center gap-2">
            {space.nome}
            <Badge tone={space.status === "ativo" ? "success" : "neutral"}>
              {space.status === "ativo" ? "Ativo" : "Inativo"}
            </Badge>
          </span>
        }
        description={space.local}
        actions={
          canManage && (
            <ConfirmButton
              variant={space.status === "ativo" ? "danger" : "secondary"}
              size="sm"
              title={space.status === "ativo" ? "Inativar espaço" : "Reativar espaço"}
              description={
                space.status === "ativo"
                  ? `O espaço "${space.nome}" não poderá mais receber novas reservas. O histórico é preservado e a inativação pode ser desfeita depois.`
                  : `O espaço "${space.nome}" voltará a aceitar novas reservas.`
              }
              confirmLabel={space.status === "ativo" ? "Inativar" : "Reativar"}
              aria-label={`${space.status === "ativo" ? "Inativar" : "Reativar"} espaço ${space.nome}`}
              onConfirm={setSpaceStatus.bind(null, id, space.status === "ativo" ? "inativo" : "ativo")}
            >
              {space.status === "ativo" ? "Inativar espaço" : "Reativar espaço"}
            </ConfirmButton>
          )
        }
      />

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
