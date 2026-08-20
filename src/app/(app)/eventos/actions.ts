"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import type { EventStatus } from "@/lib/domain/types";

function readEventFields(formData: FormData) {
  return {
    titulo: String(formData.get("titulo") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "") || undefined,
    tematica: String(formData.get("tematica") ?? "") || undefined,
    categoria: String(formData.get("categoria") ?? "").trim(),
    status: (String(formData.get("status") ?? "rascunho") as EventStatus),
    responsavelId: String(formData.get("responsavelId") ?? ""),
    demandante: String(formData.get("demandante") ?? "").trim(),
    contatoDemandante: String(formData.get("contatoDemandante") ?? "") || undefined,
    tipoLocalizacao: (String(formData.get("tipoLocalizacao") ?? "interno") as "interno" | "externo"),
    local: String(formData.get("local") ?? "") || undefined,
    spaceId: String(formData.get("spaceId") ?? "") || undefined,
    formato: (String(formData.get("formato") ?? "presencial") as "presencial" | "online" | "hibrido"),
    escopo: String(formData.get("escopo") ?? "") || undefined,
    segmento: String(formData.get("segmento") ?? "") || undefined,
    classificacao: String(formData.get("classificacao") ?? "") || undefined,
    publicoAlvo: String(formData.get("publicoAlvo") ?? "") || undefined,
    restrito: formData.get("restrito") === "on",
    detalhesPlanejamento: String(formData.get("detalhesPlanejamento") ?? "") || undefined,
    jornadaParticipante: String(formData.get("jornadaParticipante") ?? "") || undefined,
    estrategico: formData.get("estrategico") === "on",
    previstoOrcamento: formData.get("previstoOrcamento") === "on",
    frequencia: (String(formData.get("frequencia") ?? "unico") as "unico" | "diario" | "semanal" | "mensal"),
  };
}

export async function updateEvent(id: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  const fields = readEventFields(formData);

  if (!fields.titulo || !fields.categoria || !fields.demandante) {
    redirect(`/eventos/${id}/editar?error=${encodeURIComponent("Preencha título, categoria e demandante.")}`);
  }

  try {
    await repository.events.update(session, id, fields);
    revalidatePath(`/eventos/${id}`);
    revalidatePath("/eventos");
    revalidatePath("/dashboard");
    redirect(`/eventos/${id}?updated=1`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    redirect(`/eventos/${id}/editar?error=${encodeURIComponent(errorMessage(err))}`);
  }
}

export async function changeEventStatus(id: string, status: EventStatus): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.events.updateStatus(session, id, status);
  revalidatePath(`/eventos/${id}`);
  revalidatePath("/eventos");
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
}

export async function cancelEvent(id: string): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.events.cancel(session, id);
  revalidatePath(`/eventos/${id}`);
  revalidatePath("/eventos");
  revalidatePath("/dashboard");
  revalidatePath("/agenda");
}

export async function addEventSession(eventId: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  const inicio = String(formData.get("inicio") ?? "");
  const fim = String(formData.get("fim") ?? "");
  const observacao = String(formData.get("observacao") ?? "") || undefined;

  if (!inicio || !fim) {
    redirect(`/eventos/${eventId}?error=${encodeURIComponent("Informe início e fim da sessão.")}`);
  }
  if (new Date(fim).getTime() <= new Date(inicio).getTime()) {
    redirect(`/eventos/${eventId}?error=${encodeURIComponent("A data/hora final deve ser posterior à data/hora inicial.")}`);
  }

  const current = await repository.events.getSessions(session, eventId);
  await repository.events.replaceSessions(session, eventId, [
    ...current.map((s) => ({ inicio: s.inicio, fim: s.fim, observacao: s.observacao })),
    { inicio: new Date(inicio).toISOString(), fim: new Date(fim).toISOString(), observacao },
  ]);
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/agenda");
  redirect(`/eventos/${eventId}?tab=sessoes`);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Não foi possível concluir a operação.";
}

function isRedirectError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "digest" in err && String((err as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}
