import { notFound } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { isAtlasConfigured } from "@/lib/atlas/providers";
import { Card, Banner } from "@/components/ui/primitives";
import { PageHeader } from "@/components/layout/Breadcrumb";
import { AtlasPanel } from "./AtlasPanel";

export default async function EventAtlasPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const { id } = await params;

  const event = await repository.events.get(session, id);
  if (!event) notFound();

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        breadcrumb={[{ label: "Eventos", href: "/eventos" }, { label: event.titulo, href: `/eventos/${id}` }, { label: "Atlas" }]}
        backHref={`/eventos/${id}`}
        backLabel="Voltar para o evento"
        title="Atlas"
        description={`Especialista de IA do 7Eventos para "${event.titulo}" — respostas baseadas só nos dados deste evento que você tem permissão de ver.`}
      />

      {isAtlasConfigured() ? (
        <AtlasPanel eventId={id} />
      ) : (
        <Card>
          <div className="p-5">
            <Banner tone="info">
              Atlas ainda não está configurado nesta implantação (variável de ambiente OPENAI_API_KEY ausente).
              Assim que a chave for provisionada, o assistente contextual e o resumo executivo ficam disponíveis
              automaticamente, sem mudança de código.
            </Banner>
          </div>
        </Card>
      )}
    </div>
  );
}
