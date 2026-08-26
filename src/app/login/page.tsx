import { redirect } from "next/navigation";
import Image from "next/image";
import { getAuthSession } from "@/lib/auth/session";
import { getDataMode } from "@/lib/data";
import { getStore } from "@/lib/data/mock/store";
import { ROLE_LABELS } from "@/lib/domain/types";
import { loginAsDemoUser, loginWithPassword } from "@/lib/auth/actions";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/primitives";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { brandingStyle } from "@/lib/branding";

export default async function LoginPage() {
  const session = await getAuthSession();
  if (session) redirect("/dashboard");

  const mode = getDataMode();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        <div className="hidden md:block">
          <div className="mb-6">
            <Image src="/consult-services-icon.png" alt="Consult Services" width={48} height={48} priority />
          </div>
          <h1 className="text-3xl font-semibold text-[var(--foreground)] leading-tight">
            7Eventos
          </h1>
          <p className="text-fg-muted mt-2 max-w-sm">
            Planeje. Organize. Execute. Aprenda. Plataforma Consult Services
            para gestão completa de eventos.
          </p>
        </div>

        <Card className="p-6 md:p-8">
          {mode === "mock" ? <DemoLogin /> : <PasswordLogin />}
        </Card>
      </div>
    </div>
  );
}

async function DemoLogin() {
  const store = getStore();
  const companies = store.companies;

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Entrar (ambiente de demonstração)</h2>
      <p className="text-sm text-fg-muted mt-1">
        Escolha um usuário de demonstração para explorar o 7Eventos. Os dados
        são fictícios e podem ser restaurados a qualquer momento.
      </p>

      <div className="mt-6 space-y-6 max-h-[60vh] overflow-y-auto pr-1">
        {companies.map((company) => (
          <div key={company.id} style={brandingStyle(company)}>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-8 w-8 rounded-lg border border-border bg-white p-1 flex items-center justify-center">
                <BrandLogo company={company} compact />
              </span>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                {company.nomeFantasia}
              </p>
            </div>
            <div className="space-y-2">
              {store.users
                .filter((u) => u.companyId === company.id)
                .map((user) => (
                  <form key={user.id} action={loginAsDemoUser.bind(null, user.id)}>
                    <button
                      type="submit"
                      disabled={user.status !== "ativo"}
                      className="w-full flex items-center gap-3 rounded-[var(--radius-sm)] border border-border-subtle px-3 py-2 text-left hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <span
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                        style={{ backgroundColor: user.avatarColor }}
                      >
                        {user.nome
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-[var(--foreground)] truncate">
                          {user.nome}
                          {user.status !== "ativo" && " (inativo)"}
                        </span>
                        <span className="block text-xs text-fg-muted truncate">
                          {ROLE_LABELS[user.perfil]}
                        </span>
                      </span>
                    </button>
                  </form>
                ))}
            </div>
          </div>
        ))}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-2">
            Plataforma
          </p>
          {store.users
            .filter((u) => u.perfil === "superadmin")
            .map((user) => (
              <form key={user.id} action={loginAsDemoUser.bind(null, user.id)}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-3 rounded-[var(--radius-sm)] border border-border-subtle px-3 py-2 text-left hover:bg-surface-muted transition-colors"
                >
                  <span
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                    style={{ backgroundColor: user.avatarColor }}
                  >
                    {user.nome
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-[var(--foreground)] truncate">
                      {user.nome}
                    </span>
                    <span className="block text-xs text-fg-muted truncate">
                      {ROLE_LABELS[user.perfil]}
                    </span>
                  </span>
                </button>
              </form>
            ))}
        </div>
      </div>
    </div>
  );
}

function PasswordLogin() {
  async function action(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    await loginWithPassword(email, password);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Entrar no 7Eventos</h2>
      <p className="text-sm text-fg-muted mt-1">Use seu e-mail corporativo e senha.</p>
      <form action={action} className="mt-6 space-y-4">
        <Field label="E-mail" htmlFor="email" required>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Senha" htmlFor="password" required>
          <Input id="password" name="password" type="password" required autoComplete="current-password" />
        </Field>
        <Button type="submit" className="w-full" size="lg">
          Entrar
        </Button>
      </form>
    </div>
  );
}
