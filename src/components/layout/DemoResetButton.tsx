"use client";

import { resetDemoData } from "@/lib/data/mock/actions";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

export function DemoResetButton() {
  return (
    <ConfirmButton
      variant="secondary"
      size="sm"
      title="Restaurar dados de demonstração?"
      description="Todos os eventos, reservas, espaços e demais registros voltam ao estado inicial de demonstração. Alterações feitas nesta sessão serão perdidas."
      confirmLabel="Restaurar dados"
      onConfirm={() => resetDemoData()}
    >
      Restaurar dados de demo
    </ConfirmButton>
  );
}
