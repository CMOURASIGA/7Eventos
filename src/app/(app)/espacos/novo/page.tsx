import { requireAuthSession } from "@/lib/auth/session";
import { can } from "@/lib/domain/permissions";
import { redirect } from "next/navigation";
import { Card, CardHeader, Field, Input, Textarea, Banner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { createSpace } from "../actions";

export default async function NewSpacePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireAuthSession();
  if (!can(session.perfil, "manage_spaces")) redirect("/espacos");
  const { error } = await searchParams;

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Novo espaço</h1>
        <p className="text-sm text-fg-muted">Cadastre um novo espaço disponível para reservas e eventos.</p>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}

      <Card>
        <CardHeader title="Dados do espaço" />
        <form action={createSpace} className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome" htmlFor="nome" required>
              <Input id="nome" name="nome" required maxLength={120} />
            </Field>
            <Field label="Local" htmlFor="local" required>
              <Input id="local" name="local" required maxLength={160} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Capacidade" htmlFor="capacidade" required>
              <Input id="capacidade" name="capacidade" type="number" min={0} required />
            </Field>
          </div>
          <Field label="Descrição" htmlFor="descricao">
            <Textarea id="descricao" name="descricao" maxLength={500} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Características" htmlFor="caracteristicas" hint="Separe por vírgula">
              <Input id="caracteristicas" name="caracteristicas" placeholder="Palco, Acessível, Formato U" />
            </Field>
            <Field label="Equipamentos" htmlFor="equipamentos" hint="Separe por vírgula">
              <Input id="equipamentos" name="equipamentos" placeholder="Projetor, Som, Microfone" />
            </Field>
          </div>
          <Field label="Observações" htmlFor="observacoes">
            <Textarea id="observacoes" name="observacoes" maxLength={500} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit">Salvar espaço</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
