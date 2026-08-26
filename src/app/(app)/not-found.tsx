import { Card, Banner } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Fronteira de "não encontrado" da área autenticada — cobre tanto uma
 * URL inválida quanto um `notFound()` explícito (ex.: evento/espaço/
 * reserva que não existe mais na instância que atendeu a requisição).
 * Sem este arquivo, o Next.js mostra uma página em branco padrão, sem
 * navegação nem contexto do produto.
 */
export default function AppNotFound() {
  return (
    <div className="max-w-lg mx-auto mt-10">
      <Card>
        <div className="p-6 space-y-4">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Página não encontrada</h1>
          <Banner tone="info">
            O registro que você tentou acessar não existe ou não está mais disponível.
          </Banner>
          <div className="pt-2">
            <ButtonLink href="/dashboard">Ir para o painel</ButtonLink>
          </div>
        </div>
      </Card>
    </div>
  );
}
