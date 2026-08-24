import { notFound } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { isAtlasConfigured } from "@/lib/atlas/providers";
import { Card, Banner } from "@/components/ui/primitives";
import { PageHeader } from "@/components/layout/Breadcrumb";
import { VoiceRoomPanel } from "../VoiceRoomPanel";

export default async function EventVoiceRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuthSession();
  const repository = getRepository();
  const { id } = await params;

  const event = await repository.events.get(session, id);
  if (!event) notFound();

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        breadcrumb={[
          { label: "Eventos", href: "/eventos" },
          { label: event.titulo, href: `/eventos/${id}` },
          { label: "Atlas", href: `/eventos/${id}/atlas` },
          { label: "Voice Room" },
        ]}
        backHref={`/eventos/${id}/atlas`}
        backLabel="Voltar para o Atlas"
        title="Voice Room"
        description={`Converse por voz com o Atlas sobre "${event.titulo}" — seu navegador precisa de permissão de microfone.`}
      />

      {isAtlasConfigured() ? (
        <VoiceRoomPanel eventId={id} />
      ) : (
        <Card>
          <div className="p-5">
            <Banner tone="info">
              O Voice Room ainda não está configurado nesta implantação (variável de ambiente OPENAI_API_KEY
              ausente). Assim que a chave for provisionada, ele fica disponível automaticamente, sem mudança de
              código.
            </Banner>
          </div>
        </Card>
      )}
    </div>
  );
}
