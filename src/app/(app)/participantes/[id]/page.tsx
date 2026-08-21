import { notFound } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import { CATEGORIAS_PARTICIPANTE } from "@/lib/domain/catalog";
import { Card, CardHeader, Field, Input, Select, Textarea, Badge, Banner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { PageHeader } from "@/components/layout/Breadcrumb";
import { updateParticipant, setParticipantStatus } from "../actions";

export default async function ParticipantDetailPage({
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

  const participant = await repository.participants.get(session, id);
  if (!participant) notFound();

  const canManage = can(session.perfil, "manage_participants");
  const updateAction = updateParticipant.bind(null, id);

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        breadcrumb={[{ label: "Participantes", href: "/participantes" }, { label: participant.nome }]}
        backHref="/participantes"
        title={
          <span className="flex items-center gap-2 flex-wrap">
            {participant.nome}
            <Badge tone={participant.status === "ativo" ? "success" : "neutral"}>
              {participant.status === "ativo" ? "Ativo" : "Inativo"}
            </Badge>
          </span>
        }
        description={participant.email}
        actions={
          canManage && (
            <ConfirmButton
              variant={participant.status === "ativo" ? "danger" : "secondary"}
              size="sm"
              title={participant.status === "ativo" ? "Inativar participante" : "Reativar participante"}
              description={
                participant.status === "ativo"
                  ? `O participante "${participant.nome}" não poderá mais ser inscrito em novos eventos. O histórico é preservado e a inativação pode ser desfeita depois.`
                  : `O participante "${participant.nome}" volta a poder ser inscrito em eventos.`
              }
              confirmLabel={participant.status === "ativo" ? "Inativar" : "Reativar"}
              aria-label={`${participant.status === "ativo" ? "Inativar" : "Reativar"} participante ${participant.nome}`}
              onConfirm={setParticipantStatus.bind(null, id, participant.status === "ativo" ? "inativo" : "ativo")}
            >
              {participant.status === "ativo" ? "Inativar participante" : "Reativar participante"}
            </ConfirmButton>
          )
        }
      />

      {error && <Banner tone="danger">{error}</Banner>}
      {updated === "1" && <Banner tone="success">Participante atualizado com sucesso.</Banner>}

      <Card>
        <CardHeader title="Dados do participante" />
        <form action={updateAction} className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome" htmlFor="nome" required>
              <Input id="nome" name="nome" defaultValue={participant.nome} required disabled={!canManage} />
            </Field>
            <Field label="E-mail" htmlFor="email" required>
              <Input id="email" name="email" type="email" defaultValue={participant.email} required disabled={!canManage} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Telefone" htmlFor="telefone">
              <Input id="telefone" name="telefone" defaultValue={participant.telefone} disabled={!canManage} />
            </Field>
            <Field label="Categoria" htmlFor="categoria">
              <Select id="categoria" name="categoria" defaultValue={participant.categoria ?? ""} disabled={!canManage}>
                <option value="">Nenhuma</option>
                {CATEGORIAS_PARTICIPANTE.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Organização" htmlFor="organizacao">
            <Input id="organizacao" name="organizacao" defaultValue={participant.organizacao} disabled={!canManage} />
          </Field>
          <Field label="Observações" htmlFor="observacoes">
            <Textarea id="observacoes" name="observacoes" defaultValue={participant.observacoes} disabled={!canManage} />
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
