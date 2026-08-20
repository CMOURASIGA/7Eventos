import { redirect } from "next/navigation";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { can } from "@/lib/domain/permissions";
import { ROLE_LABELS } from "@/lib/domain/types";
import { Card, CardHeader, Field, Input, Select, Badge, Banner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { createUser, setUserStatus } from "./actions";
import { UserRoleSelect } from "./UserRoleSelect";

export default async function UsersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const session = await requireAuthSession();
  if (!can(session.perfil, "manage_company_users")) redirect("/dashboard");

  const repository = getRepository();
  const { error, created } = await searchParams;
  const users = await repository.users.list(session);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Usuários</h1>
        <p className="text-sm text-fg-muted">Administração de usuários e perfis da sua empresa.</p>
      </div>

      {error && <Banner tone="danger">{error}</Banner>}
      {created === "1" && <Banner tone="success">Usuário criado com sucesso.</Banner>}

      <Card>
        <CardHeader title="Novo usuário" />
        <form action={createUser} className="p-5 grid sm:grid-cols-3 gap-4 items-end">
          <Field label="Nome" htmlFor="nome" required>
            <Input id="nome" name="nome" required />
          </Field>
          <Field label="E-mail" htmlFor="email" required>
            <Input id="email" name="email" type="email" required />
          </Field>
          <Field label="Perfil" htmlFor="perfil" required>
            <Select id="perfil" name="perfil" defaultValue="consulta">
              <option value="admin_empresa">{ROLE_LABELS.admin_empresa}</option>
              <option value="gestor_eventos">{ROLE_LABELS.gestor_eventos}</option>
              <option value="operador">{ROLE_LABELS.operador}</option>
              <option value="consulta">{ROLE_LABELS.consulta}</option>
            </Select>
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit">Criar usuário</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Usuários da empresa" description={`${users.length} cadastrados`} />
        <ul className="divide-y divide-border-subtle">
          {users.map((user) => (
            <li key={user.id} className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {user.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">{user.nome}</p>
                  <p className="text-xs text-fg-muted truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user.id === session.userId ? (
                  <Badge tone="brand">{ROLE_LABELS[user.perfil]}</Badge>
                ) : (
                  <UserRoleSelect userId={user.id} current={user.perfil} />
                )}
                <Badge tone={user.status === "ativo" ? "success" : "neutral"}>
                  {user.status === "ativo" ? "Ativo" : "Inativo"}
                </Badge>
                {user.id !== session.userId && (
                  <ConfirmButton
                    size="sm"
                    variant="secondary"
                    title={user.status === "ativo" ? "Inativar usuário" : "Reativar usuário"}
                    description={
                      user.status === "ativo"
                        ? "O usuário perderá acesso ao sistema imediatamente."
                        : "O usuário poderá acessar o sistema novamente."
                    }
                    confirmLabel={user.status === "ativo" ? "Inativar" : "Reativar"}
                    onConfirm={setUserStatus.bind(null, user.id, user.status === "ativo" ? "inativo" : "ativo")}
                  >
                    {user.status === "ativo" ? "Inativar" : "Reativar"}
                  </ConfirmButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
