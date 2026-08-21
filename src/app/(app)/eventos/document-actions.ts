"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import type { EventDocumentCategory } from "@/lib/domain/types";

export async function addDocument(eventId: string, formData: FormData): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const responsavelId = String(formData.get("responsavelId") ?? "");
  if (!titulo || !responsavelId) {
    redirect(`/eventos/${eventId}?tab=documentos&error=${encodeURIComponent("Informe título e responsável do documento.")}`);
  }

  await repository.documents.create(session, {
    eventId,
    categoria: (String(formData.get("categoria") ?? "outros") as EventDocumentCategory),
    titulo,
    descricao: String(formData.get("descricao") ?? "") || undefined,
    urlReferencia: String(formData.get("urlReferencia") ?? "") || undefined,
    nomeArquivo: String(formData.get("nomeArquivo") ?? "") || undefined,
    responsavelId,
  });
  revalidatePath(`/eventos/${eventId}`);
}

export async function archiveDocument(eventId: string, documentId: string): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.documents.archive(session, documentId);
  revalidatePath(`/eventos/${eventId}`);
}

export async function restoreDocument(eventId: string, documentId: string): Promise<void> {
  const session = await requireAuthSession();
  const repository = getRepository();
  await repository.documents.restore(session, documentId);
  revalidatePath(`/eventos/${eventId}`);
}
