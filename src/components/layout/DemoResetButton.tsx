"use client";

import { useTransition } from "react";
import { resetDemoData } from "@/lib/data/mock/actions";
import { Button } from "@/components/ui/Button";

export function DemoResetButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => resetDemoData())}
      title="Restaura a base de demonstração ao estado inicial"
    >
      {pending ? "Restaurando..." : "Restaurar dados de demo"}
    </Button>
  );
}
