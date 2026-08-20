import { notFound, redirect } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can, canCreateEvent } from "@/lib/domain/permissions";
import { CATEGORIAS, TEMATICAS } from "@/lib/domain/catalog";
import { EVENT_STATUS_LABELS } from "@/lib/domain/types";
import { Card, CardHeader, Field, Input, Select, Textarea, Banner, Badge } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/Breadcrumb";
import { WizardSteps } from "../../WizardSteps";
import { wizardStep1, wizardStep2, wizardStep3, wizardStep4, wizardFinish } from "../../wizard-actions";

export default async function EditWizardStepPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string; error?: string }>;
}) {
  const session = await requireAuthSession();
  if (!canCreateEvent(session.perfil)) redirect("/eventos?negado=1");
  const canEditAnyEvent = can(session.perfil, "create_edit_event");

  const repository = getRepository();
  const { id } = await params;
  const { error } = await searchParams;
  const step = Math.min(5, Math.max(1, Number((await searchParams).step) || 2));

  const [event, spaces, users] = await Promise.all([
    repository.events.get(session, id),
    repository.spaces.list(session, { status: "ativo" }),
    repository.users.list(session),
  ]);
  if (!event) notFound();
  // Quem só tem "create_event" (Operador) só pode continuar pelo assistente
  // o próprio rascunho ainda não publicado.
  if (!canEditAnyEvent && (event.createdBy !== session.userId || event.status !== "rascunho")) {
    redirect("/eventos?negado=1");
  }

  // Evita "Eu mesmo" e o próprio nome aparecerem como duas opções distintas.
  const otherUsers = users.filter((u) => u.id !== session.userId);
  const currentUser = users.find((u) => u.id === session.userId);

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        breadcrumb={[{ label: "Eventos", href: "/eventos" }, { label: event.titulo || "Novo evento" }]}
        backHref={`/eventos/${id}`}
        backLabel="Salvar rascunho e sair"
        title={event.titulo || "Novo evento"}
        description="Assistente de criação — seus dados são salvos automaticamente a cada etapa."
      />

      <WizardSteps eventId={id} current={step} />

      {error && <Banner tone="danger">{error}</Banner>}

      {step === 1 && (
        <Card>
          <CardHeader title="Informações básicas" />
          <form action={wizardStep1.bind(null, id)} className="p-5 space-y-4">
            <Field label="Título" htmlFor="titulo" required>
              <Input id="titulo" name="titulo" required maxLength={160} defaultValue={event.titulo} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Categoria" htmlFor="categoria" required>
                <Select id="categoria" name="categoria" required defaultValue={event.categoria}>
                  <option value="" disabled>
                    Selecione
                  </option>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Temática" htmlFor="tematica">
                <Select id="tematica" name="tematica" defaultValue={event.tematica ?? ""}>
                  <option value="">Selecione</option>
                  {TEMATICAS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Descrição" htmlFor="descricao">
              <Textarea id="descricao" name="descricao" maxLength={1000} defaultValue={event.descricao} />
            </Field>
            <StepActions eventId={id} />
          </form>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader title="Data e localização" />
          <form action={wizardStep2.bind(null, id)} className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Início da sessão" htmlFor="sessaoInicio" hint="Pode ajustar/adicionar mais sessões depois, no detalhe do evento">
                <Input id="sessaoInicio" name="sessaoInicio" type="datetime-local" />
              </Field>
              <Field label="Fim da sessão" htmlFor="sessaoFim">
                <Input id="sessaoFim" name="sessaoFim" type="datetime-local" />
              </Field>
            </div>
            <Field label="Frequência" htmlFor="frequencia">
              <Select id="frequencia" name="frequencia" defaultValue={event.frequencia ?? "unico"}>
                <option value="unico">Único</option>
                <option value="diario">Diário</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
              </Select>
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Tipo de localização" htmlFor="tipoLocalizacao">
                <Select id="tipoLocalizacao" name="tipoLocalizacao" defaultValue={event.tipoLocalizacao}>
                  <option value="interno">Interno</option>
                  <option value="externo">Externo</option>
                </Select>
              </Field>
              <Field label="Formato" htmlFor="formato">
                <Select id="formato" name="formato" defaultValue={event.formato ?? "presencial"}>
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                  <option value="hibrido">Híbrido</option>
                </Select>
              </Field>
              <Field label="Espaço" htmlFor="spaceId" hint="Para localização interna">
                <Select id="spaceId" name="spaceId" defaultValue={event.spaceId ?? ""}>
                  <option value="">Nenhum</option>
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} — {s.local}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Local" htmlFor="local" hint="Quando for espaço externo">
                <Input id="local" name="local" defaultValue={event.local} />
              </Field>
            </div>
            <StepActions eventId={id} />
          </form>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader title="Responsáveis e público" />
          <form action={wizardStep3.bind(null, id)} className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Demandante" htmlFor="demandante" required>
                <Input id="demandante" name="demandante" required maxLength={160} defaultValue={event.demandante} />
              </Field>
              <Field label="Contato do demandante" htmlFor="contatoDemandante">
                <Input id="contatoDemandante" name="contatoDemandante" defaultValue={event.contatoDemandante} />
              </Field>
            </div>
            <Field label="Responsável" htmlFor="responsavelId">
              <Select
                id="responsavelId"
                name="responsavelId"
                defaultValue={event.responsavelId === session.userId ? "" : event.responsavelId}
              >
                <option value="">Eu mesmo{currentUser ? ` (${currentUser.nome})` : ""}</option>
                {otherUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Público-alvo" htmlFor="publicoAlvo">
              <Input id="publicoAlvo" name="publicoAlvo" defaultValue={event.publicoAlvo} />
            </Field>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <input type="checkbox" name="restrito" defaultChecked={event.restrito} className="rounded" />
                Público restrito
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <input type="checkbox" name="estrategico" defaultChecked={event.estrategico} className="rounded" />
                Evento estratégico
              </label>
            </div>
            <StepActions eventId={id} />
          </form>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader title="Planejamento" />
          <form action={wizardStep4.bind(null, id)} className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Escopo" htmlFor="escopo">
                <Input id="escopo" name="escopo" defaultValue={event.escopo} />
              </Field>
              <Field label="Segmento" htmlFor="segmento">
                <Input id="segmento" name="segmento" defaultValue={event.segmento} />
              </Field>
              <Field label="Classificação" htmlFor="classificacao">
                <Input id="classificacao" name="classificacao" defaultValue={event.classificacao} />
              </Field>
            </div>
            <Field label="Detalhes do planejamento" htmlFor="detalhesPlanejamento">
              <Textarea id="detalhesPlanejamento" name="detalhesPlanejamento" defaultValue={event.detalhesPlanejamento} />
            </Field>
            <Field label="Jornada do participante" htmlFor="jornadaParticipante">
              <Textarea id="jornadaParticipante" name="jornadaParticipante" defaultValue={event.jornadaParticipante} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
              <input type="checkbox" name="previstoOrcamento" defaultChecked={event.previstoOrcamento} className="rounded" />
              Previsto em orçamento
            </label>
            <StepActions eventId={id} />
          </form>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardHeader
            title="Revisão"
            description={
              canEditAnyEvent
                ? "Confira os dados antes de concluir o cadastro."
                : "Confira os dados antes de enviar para revisão. Um gestor precisa aprovar para o evento avançar de status."
            }
          />
          <div className="p-5 space-y-4 text-sm">
            <SummaryRow label="Título" value={event.titulo} />
            <SummaryRow label="Categoria / Temática" value={`${event.categoria}${event.tematica ? ` · ${event.tematica}` : ""}`} />
            <SummaryRow label="Demandante" value={event.demandante || "—"} />
            <SummaryRow label="Localização" value={`${event.tipoLocalizacao === "interno" ? "Interno" : "Externo"}${event.local ? ` · ${event.local}` : ""}`} />
            <SummaryRow label="Status atual" value={<Badge tone="brand">{EVENT_STATUS_LABELS[event.status]}</Badge>} />
          </div>
          <div className="p-5 pt-0 flex flex-wrap justify-between gap-3">
            <ButtonLink href={`/eventos/${id}`} variant="secondary">
              Salvar como rascunho e sair
            </ButtonLink>
            <form action={wizardFinish.bind(null, id)}>
              <Button type="submit">{canEditAnyEvent ? "Concluir cadastro" : "Enviar para revisão do gestor"}</Button>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}

function StepActions({ eventId }: { eventId: string }) {
  return (
    <div className="flex justify-between pt-2">
      <ButtonLink href={`/eventos/${eventId}`} variant="secondary" size="sm">
        Salvar rascunho e sair
      </ButtonLink>
      <Button type="submit">Continuar</Button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-subtle pb-2 last:border-0">
      <span className="text-fg-muted">{label}</span>
      <span className="text-[var(--foreground)] text-right">{value}</span>
    </div>
  );
}
