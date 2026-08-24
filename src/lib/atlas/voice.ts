import "server-only";
import { z } from "zod";
import type { AuthSession } from "@/lib/domain/types";
import type { Repository } from "@/lib/data/repository";
import { getAtlasProvider } from "./providers";
import { AtlasValidationError, classifyAtlasError } from "./errors";
import { recordAtlasAudit } from "./audit";

/**
 * Atlas (Fase 3) - Voice Room (docs/FASE_03_ATLAS.md seção 11): ouvidos e
 * boca do Atlas. O "cérebro" continua sendo askAtlas() (chat.ts), sem
 * nenhuma mudança — este arquivo só converte fala em texto (antes de
 * perguntar) e texto em fala (depois de responder), o mesmo padrão já
 * validado no 7Commander (services/voice/openai-stt.ts e openai-tts.ts):
 * gravação no navegador -> transcrição -> pergunta normal ao Atlas ->
 * síntese de voz -> reprodução. Nenhuma sessão de áudio em tempo real,
 * nenhum WebRTC.
 *
 * Autorização: mesma regra do chat/resumo — quem enxerga o evento
 * (repository.events.get não retorna null) pode usar a voz nele.
 *
 * Cota: transcrição e síntese são etapas de suporte de UMA interação já
 * contabilizada por askAtlas() — não entram no limite diário de
 * interações (consomeCota: false), senão um turno de voz consumiria 3x
 * a cota de um turno de texto equivalente. Continuam auditadas
 * (sucesso/falha, duração) para visibilidade de custo — mesma mecânica
 * já usada para falhas de config/auth/infra, mas aqui pelo motivo
 * inverso (etapa de apoio, não falha).
 */

const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // ~alguns minutos de fala — controla custo e evita abuso (seção 13).
const MAX_SPEECH_TEXT_LENGTH = 3500; // a API aceita até 4096 caracteres; folga para não estourar no limite exato.

const AtlasSpeechTextSchema = z.string().trim().min(1, "Texto vazio.").max(MAX_SPEECH_TEXT_LENGTH, "Texto muito longo para gerar áudio.");

function validateSpeechText(value: unknown): string {
  const result = AtlasSpeechTextSchema.safeParse(value);
  if (!result.success) {
    throw new AtlasValidationError(result.error.issues[0]?.message ?? "Texto inválido para gerar áudio.");
  }
  return result.data;
}

export async function transcribeVoiceInput(
  session: AuthSession,
  eventId: string,
  repository: Repository,
  audioBuffer: ArrayBuffer,
  mimeType: string,
): Promise<string> {
  if (audioBuffer.byteLength === 0) {
    throw new AtlasValidationError("Nenhum áudio recebido. Tente gravar novamente.");
  }
  if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
    throw new AtlasValidationError("Áudio muito longo. Grave uma mensagem mais curta.");
  }

  const event = await repository.events.get(session, eventId);
  if (!event) throw new AtlasValidationError("Evento não encontrado.");

  const startedAt = Date.now();
  try {
    const result = await getAtlasProvider().transcribeAudio({ audioBuffer, mimeType });

    await recordAtlasAudit(session, repository, {
      entidade: "atlas_voz_transcricao",
      entidadeId: eventId,
      descricao: `Transcrição de voz para o evento "${event.titulo}".`,
      status: "sucesso",
      consomeCota: false,
      provider: result.provider,
      model: result.model,
      inputTokens: 0,
      outputTokens: 0,
      durationMs: Date.now() - startedAt,
    });

    return result.text;
  } catch (err) {
    const { codigoErro } = classifyAtlasError(err);
    await recordAtlasAudit(session, repository, {
      entidade: "atlas_voz_transcricao",
      entidadeId: eventId,
      descricao: `Falha ao transcrever voz para o evento "${event.titulo}".`,
      status: "falha",
      consomeCota: false,
      model: "desconhecido",
      inputTokens: 0,
      outputTokens: 0,
      durationMs: Date.now() - startedAt,
      errorCode: codigoErro,
    });
    throw err;
  }
}

export async function synthesizeVoiceResponse(
  session: AuthSession,
  eventId: string,
  repository: Repository,
  rawText: unknown,
): Promise<{ audioBuffer: ArrayBuffer; contentType: string }> {
  const text = validateSpeechText(rawText);

  const event = await repository.events.get(session, eventId);
  if (!event) throw new AtlasValidationError("Evento não encontrado.");

  const startedAt = Date.now();
  try {
    const result = await getAtlasProvider().synthesizeSpeech({ text });

    await recordAtlasAudit(session, repository, {
      entidade: "atlas_voz_sintese",
      entidadeId: eventId,
      descricao: `Síntese de voz para o evento "${event.titulo}".`,
      status: "sucesso",
      consomeCota: false,
      provider: result.provider,
      model: result.model,
      inputTokens: 0,
      outputTokens: 0,
      durationMs: Date.now() - startedAt,
    });

    return { audioBuffer: result.audioBuffer, contentType: result.contentType };
  } catch (err) {
    const { codigoErro } = classifyAtlasError(err);
    await recordAtlasAudit(session, repository, {
      entidade: "atlas_voz_sintese",
      entidadeId: eventId,
      descricao: `Falha ao gerar áudio de resposta para o evento "${event.titulo}".`,
      status: "falha",
      consomeCota: false,
      model: "desconhecido",
      inputTokens: 0,
      outputTokens: 0,
      durationMs: Date.now() - startedAt,
      errorCode: codigoErro,
    });
    throw err;
  }
}
