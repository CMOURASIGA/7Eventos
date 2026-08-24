import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { isAtlasConfigured } from "@/lib/atlas/providers";
import { collectEventContext } from "@/lib/atlas/context";
import { generateEventBriefing } from "@/lib/atlas/briefing";
import { Card, Banner } from "@/components/ui/primitives";
import { PageHeader } from "@/components/layout/Breadcrumb";
import { AtlasPanel } from "./AtlasPanel";
import { RiskSignalsCard } from "./RiskSignalsCard";
import { FinancialAnalysisCard } from "./FinancialAnalysisCard";
import { BriefingCard } from "./BriefingCard";

export default async function EventAtlasPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const { id } = await params;

  const event = await repository.events.get(session, id);
  if (!event) notFound();

  // Motor de riscos (seção 6), próximas ações (seção 7) e briefing
  // (seção 9) são determinísticos — não chamam o provedor de IA — então
  // ficam disponíveis mesmo sem OPENAI_API_KEY configurada.
  const [context, briefing] = await Promise.all([
    collectEventContext(session, id, repository),
    generateEventBriefing(session, id, repository),
  ]);

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        breadcrumb={[{ label: "Eventos", href: "/eventos" }, { label: event.titulo, href: `/eventos/${id}` }, { label: "Atlas" }]}
        backHref={`/eventos/${id}`}
        backLabel="Voltar para o evento"
        title="Atlas"
        description={`Especialista de IA do 7Eventos para "${event.titulo}" — respostas baseadas só nos dados deste evento que você tem permissão de ver.`}
      />

      {context && <RiskSignalsCard risks={context.riscosDetectados} actions={context.acoesSugeridas} />}

      {/* Só renderiza para quem tem view_financials — o mesmo controle já aplicado ao restante do produto (context.financeiroDetalhado é null sem essa capability). */}
      {context?.financeiroDetalhado && <FinancialAnalysisCard analysis={context.financeiroDetalhado} />}

      {briefing && <BriefingCard briefing={briefing} />}

      {isAtlasConfigured() ? (
        <>
          <AtlasPanel eventId={id} canViewFinancials={Boolean(context?.financeiroDetalhado)} />
          <Card>
            <div className="p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Voice Room</p>
                <p className="text-sm text-fg-muted">Converse por voz com o Atlas sobre este evento.</p>
              </div>
              <Link
                href={`/eventos/${id}/atlas/voz`}
                className="shrink-0 px-3.5 py-2 rounded-[var(--radius-sm)] text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
              >
                Abrir Voice Room
              </Link>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <div className="p-5">
            <Banner tone="info">
              O assistente contextual e o resumo executivo do Atlas ainda não estão configurados nesta implantação
              (variável de ambiente OPENAI_API_KEY ausente). Assim que a chave for provisionada, eles ficam
              disponíveis automaticamente, sem mudança de código. Os riscos e ações sugeridas acima já funcionam
              sem essa configuração.
            </Banner>
          </div>
        </Card>
      )}
    </div>
  );
}
