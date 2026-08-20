"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

/**
 * Ações do assistente de "Novo evento" em etapas. Cada etapa grava
 * apenas os campos que ela coleta (nunca o formulário inteiro), para
 * que o rascunho já persistido nas etapas anteriores nunca seja
 * sobrescrito com valores em branco. O evento é criado como rascunho
 * já na primeira etapa, o que também é o que permite "salvar como
 * rascunho e sair" em qualquer ponto: os dados já estão salvos.
 */

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Não foi possível concluir a operação.";
}

function isRedirectError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "digest" in err && String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}

export async function wizardCreate(formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();

  const titulo = String(formData.get("titulo") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();
  const tematica = String(formData.get("tematica") ?? "") || undefined;
  const descricao = String(formData.get("descricao") ?? "") || undefined;

  if (!titulo || !categoria) {
    redirect(`/eventos/novo?error=${encodeURIComponent("Preencha ao menos o título e a categoria para continuar.")}`);
  }

  try {
    const event = await repository.events.create(
      session,
      {
        titulo,
        categoria,
        tematica,
        descricao,
        status: "rascunho",
        responsavelId: session.userId,
        demandante: "",
        tipoLocalizacao: "interno",
        formato: "presencial",
        restrito: false,
        estrategico: false,
        previstoOrcamento: false,
        frequencia: "unico",
      },
      [],
    );
    revalidatePath("/eventos");
    revalidatePath("/dashboard");
    redirect(`/eventos/${event.id}/novo?step=2`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect(`/eventos/novo?error=${encodeURIComponent(errorMessage(err))}`);
  }
}

export async function wizardStep1(id: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();

  if (!titulo || !categoria) {
    redirect(`/eventos/${id}/novo?step=1&error=${encodeURIComponent("Preencha ao menos o título e a categoria.")}`);
  }

  await repository.events.update(session, id, {
    titulo,
    categoria,
    tematica: String(formData.get("tematica") ?? "") || undefined,
    descricao: String(formData.get("descricao") ?? "") || undefined,
  });
  revalidatePath(`/eventos/${id}`);
  redirect(`/eventos/${id}/novo?step=2`);
}

export async function wizardStep2(id: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  const inicio = String(formData.get("sessaoInicio") ?? "");
  const fim = String(formData.get("sessaoFim") ?? "");

  if (inicio && fim && new Date(fim).getTime() <= new Date(inicio).getTime()) {
    redirect(`/eventos/${id}/novo?step=2&error=${encodeURIComponent("A data/hora final deve ser posterior à data/hora inicial.")}`);
  }

  await repository.events.update(session, id, {
    tipoLocalizacao: (String(formData.get("tipoLocalizacao") ?? "interno") as "interno" | "externo"),
    spaceId: String(formData.get("spaceId") ?? "") || undefined,
    local: String(formData.get("local") ?? "") || undefined,
    formato: (String(formData.get("formato") ?? "presencial") as "presencial" | "online" | "hibrido"),
    frequencia: (String(formData.get("frequencia") ?? "unico") as "unico" | "diario" | "semanal" | "mensal"),
  });

  if (inicio && fim) {
    await repository.events.replaceSessions(session, id, [
      { inicio: new Date(inicio).toISOString(), fim: new Date(fim).toISOString() },
    ]);
  }

  revalidatePath(`/eventos/${id}`);
  revalidatePath("/agenda");
  redirect(`/eventos/${id}/novo?step=3`);
}

export async function wizardStep3(id: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  const demandante = String(formData.get("demandante") ?? "").trim();

  if (!demandante) {
    redirect(`/eventos/${id}/novo?step=3&error=${encodeURIComponent("Informe o demandante do evento.")}`);
  }

  await repository.events.update(session, id, {
    demandante,
    contatoDemandante: String(formData.get("contatoDemandante") ?? "") || undefined,
    responsavelId: String(formData.get("responsavelId") ?? "") || session.userId,
    publicoAlvo: String(formData.get("publicoAlvo") ?? "") || undefined,
    restrito: formData.get("restrito") === "on",
    estrategico: formData.get("estrategico") === "on",
  });
  revalidatePath(`/eventos/${id}`);
  redirect(`/eventos/${id}/novo?step=4`);
}

export async function wizardStep4(id: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();

  await repository.events.update(session, id, {
    escopo: String(formData.get("escopo") ?? "") || undefined,
    segmento: String(formData.get("segmento") ?? "") || undefined,
    classificacao: String(formData.get("classificacao") ?? "") || undefined,
    detalhesPlanejamento: String(formData.get("detalhesPlanejamento") ?? "") || undefined,
    jornadaParticipante: String(formData.get("jornadaParticipante") ?? "") || undefined,
    previstoOrcamento: formData.get("previstoOrcamento") === "on",
  });
  revalidatePath(`/eventos/${id}`);
  redirect(`/eventos/${id}/novo?step=5`);
}

export async function wizardFinish(id: string): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.events.updateStatus(session, id, "planejamento");
  revalidatePath(`/eventos/${id}`);
  revalidatePath("/eventos");
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
  redirect(`/eventos/${id}?created=1`);
}
