"use client";

import { resetDemoData } from "@/lib/data/mock/actions";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

export function DemoResetButton() {
  return (
    <ConfirmButton
      variant="secondary"
      size="sm"
      title="Restaurar dados de demonstração?"
      description="Os dados atuais serão substituídos pelo conjunto original de demonstração. A ação afeta toda a empresa demonstrativa (todos os usuários verão a base reiniciada) e qualquer alteração feita durante esta sessão — eventos, reservas, espaços e demais registros — será perdida."
      confirmLabel="Restaurar dados"
      onConfirm={() => resetDemoData()}
    >
      Restaurar dados de demo
    </ConfirmButton>
  );
}
