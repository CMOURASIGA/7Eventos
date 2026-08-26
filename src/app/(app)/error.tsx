"use client";

import { useEffect } from "react";
import { Card, Banner } from "@/components/ui/primitives";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * Fronteira de erro da área autenticada. Sem este arquivo, qualquer
 * exceção não tratada em uma Server Action ou Server Component (ex.:
 * "Evento não encontrado" quando o rascunho não está mais disponível
 * na instância que atendeu a requisição) cai na tela genérica e crua
 * do Next.js ("This page couldn't load") — sem navegação, sem
 * explicação, parecendo a aplicação travada. Aqui mostramos algo
 * consistente com o resto do produto e uma saída clara.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto mt-10">
      <Card>
        <div className="p-6 space-y-4">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Não foi possível concluir a ação</h1>
          <Banner tone="danger">
            {error.message || "Ocorreu um erro inesperado. Tente novamente em instantes."}
          </Banner>
          <p className="text-sm text-fg-muted">
            Se você estava preenchendo um formulário, os dados salvos em etapas anteriores não foram perdidos —
            você pode tentar novamente.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={reset}>Tentar novamente</Button>
            <ButtonLink href="/dashboard" variant="secondary">
              Ir para o painel
            </ButtonLink>
          </div>
        </div>
      </Card>
    </div>
  );
}
