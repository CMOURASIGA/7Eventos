"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, Banner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import type { AtlasChatTurn } from "@/lib/atlas/types";
import { askAtlasAction, transcribeVoiceAction, synthesizeVoiceAction } from "./actions";

/**
 * Atlas (Fase 3) - Voice Room (docs/FASE_03_ATLAS.md seção 11).
 *
 * Mesmo padrão já validado no 7Commander_oficial (services/voice +
 * components/kairos/use-kairos-core.ts): grava no navegador
 * (MediaRecorder), detecta silêncio para parar sozinho, transcreve,
 * envia como pergunta normal ao Atlas (askAtlasAction — o MESMO usado
 * pelo chat de texto, sem nenhuma mudança de autorização/auditoria/rate
 * limit), converte a resposta em áudio e toca. Sem WebRTC, sem sessão de
 * áudio em tempo real.
 *
 * Escopo desta fatia: só conversa (perguntar, ouvir a resposta) — o
 * Atlas ainda não cria/edita nada no sistema por texto nem por voz (regra
 * 4 do prompt, docs seção 4), então "registrar decisão"/"criar proposta
 * de ação" citados na seção 11 ficam para quando essa capacidade de
 * escrita existir no Atlas como um todo.
 */

type VoiceState = "inativo" | "ouvindo" | "processando" | "pausado" | "erro";
type MessageSource = "voz" | "texto";
type VoiceMessage = AtlasChatTurn & { id: string; source: MessageSource };

const SILENCE_RMS_THRESHOLD = 0.02;
const MIN_RECORDING_MS = 1200;
const SILENCE_HOLD_MS = 1400;

function chooseMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "audio/webm";
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

export function VoiceRoomPanel({ eventId }: { eventId: string }) {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>("inativo");
  const [continuousMode, setContinuousMode] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceFrameRef = useRef<number | null>(null);
  const lastSoundAtRef = useRef<number>(Date.now());
  const recordingStartedAtRef = useRef<number>(Date.now());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesRef = useRef<VoiceMessage[]>([]);
  const continuousModeRef = useRef(continuousMode);
  const voiceStateRef = useRef<VoiceState>("inativo");

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { continuousModeRef.current = continuousMode; }, [continuousMode]);
  useEffect(() => { voiceStateRef.current = voiceState; }, [voiceState]);

  useEffect(() => {
    return () => {
      clearCaptureResources();
      stopCurrentAudio();
    };
  }, []);

  function clearCaptureResources() {
    if (silenceFrameRef.current) { cancelAnimationFrame(silenceFrameRef.current); silenceFrameRef.current = null; }
    if (audioContextRef.current) { void audioContextRef.current.close(); audioContextRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((track) => track.stop()); streamRef.current = null; }
  }

  function stopCurrentAudio() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current = null;
  }

  async function playResponseAudio(text: string): Promise<void> {
    const result = await synthesizeVoiceAction(eventId, text);
    if (!result.ok) throw new Error(result.error);
    const blob = base64ToBlob(result.audioBase64, result.contentType);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;
    await audio.play();
    await new Promise<void>((resolve) => {
      audio.onended = () => { URL.revokeObjectURL(url); if (audioRef.current === audio) audioRef.current = null; resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); if (audioRef.current === audio) audioRef.current = null; resolve(); };
    });
  }

  async function sendToAtlas(question: string, source: MessageSource) {
    const history = messagesRef.current.map((m) => ({ role: m.role, content: m.content }));
    const userMessage: VoiceMessage = { id: `${Date.now()}-user`, role: "user", content: question, source };
    setMessages((prev) => [...prev, userMessage]);
    setVoiceState("processando");
    setError(null);

    try {
      const result = await askAtlasAction(eventId, question, history, source === "voz" ? "voz" : "texto");
      if (!result.ok) throw new Error(result.error);

      const assistantMessage: VoiceMessage = { id: `${Date.now()}-assistant`, role: "assistant", content: result.resposta, source };
      setMessages((prev) => [...prev, assistantMessage]);

      if (source === "voz") {
        await playResponseAudio(result.resposta);
      }
      setVoiceState("pausado");

      if (source === "voz" && continuousModeRef.current) {
        window.setTimeout(() => {
          if (voiceStateRef.current !== "erro") void startListening();
        }, 400);
      }
    } catch (err) {
      setVoiceState("erro");
      setError(err instanceof Error ? err.message : "Erro inesperado ao falar com o Atlas.");
    }
  }

  async function processRecordedAudio(blob: Blob) {
    try {
      const formData = new FormData();
      formData.append("audio", blob, "voice-input.webm");
      const result = await transcribeVoiceAction(eventId, formData);
      if (!result.ok) throw new Error(result.error);
      if (!result.transcript.trim()) throw new Error("Não foi possível entender o áudio. Tente falar novamente.");
      await sendToAtlas(result.transcript, "voz");
    } catch (err) {
      setVoiceState("erro");
      setError(err instanceof Error ? err.message : "Falha no ciclo de voz.");
    }
  }

  async function startListening() {
    if (voiceState === "ouvindo" || voiceState === "processando") return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: chooseMimeType() });
      lastSoundAtRef.current = Date.now();
      recordingStartedAtRef.current = Date.now();

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.fftSize);

      const detectSilence = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (const value of dataArray) { const centered = (value - 128) / 128; sum += centered * centered; }
        const rms = Math.sqrt(sum / dataArray.length);
        if (rms > SILENCE_RMS_THRESHOLD) lastSoundAtRef.current = Date.now();
        const now = Date.now();
        const recordingForMs = now - recordingStartedAtRef.current;
        const silenceForMs = now - lastSoundAtRef.current;
        if (recorder.state === "recording" && recordingForMs > MIN_RECORDING_MS && silenceForMs > SILENCE_HOLD_MS) {
          recorder.stop();
          return;
        }
        silenceFrameRef.current = requestAnimationFrame(detectSilence);
      };

      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        clearCaptureResources();
        void processRecordedAudio(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      silenceFrameRef.current = requestAnimationFrame(detectSilence);
      setVoiceState("ouvindo");
    } catch (err) {
      setVoiceState("erro");
      setError(err instanceof Error ? err.message : "Não foi possível acessar o microfone. Verifique a permissão do navegador.");
      clearCaptureResources();
    }
  }

  function pauseListening() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
    stopCurrentAudio();
    setVoiceState("pausado");
  }

  function finishSession() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
    clearCaptureResources();
    stopCurrentAudio();
    setMessages([]);
    setVoiceState("inativo");
    setError(null);
  }

  const stateLabel: Record<VoiceState, { label: string; sub: string }> = {
    inativo: { label: "Pronto para começar", sub: "Clique no microfone para iniciar a conversa por voz." },
    ouvindo: { label: "Escutando...", sub: "Fale agora — a gravação para sozinha quando você parar de falar." },
    processando: { label: "Processando...", sub: "Aguarde a resposta do Atlas." },
    pausado: { label: "Pausado", sub: "Clique no microfone para retomar." },
    erro: { label: "Algo deu errado", sub: "Veja o erro abaixo e tente novamente." },
  };
  const current = stateLabel[voiceState];

  return (
    <Card>
      <CardHeader
        title="Voice Room"
        description="Converse por voz com o Atlas sobre este evento — mesma inteligência do chat de texto, com ouvidos e boca."
      />
      <div className="p-5 space-y-4">
        {messages.length === 0 ? (
          <p className="text-sm text-fg-muted italic">Inicie uma conversa por voz para ver o histórico aqui.</p>
        ) : (
          <ul className="space-y-3 max-h-[24rem] overflow-y-auto">
            {messages.map((message) => (
              <li
                key={message.id}
                className={`rounded-[var(--radius-sm)] px-3.5 py-2.5 text-sm max-w-[85%] ${
                  message.role === "user" ? "bg-brand-600 text-white ml-auto" : "bg-surface-muted text-[var(--foreground)]"
                }`}
              >
                {message.role === "assistant" ? <MarkdownContent content={message.content} /> : message.content}
                {message.source === "voz" && <span className="block text-xs opacity-70 mt-1">por voz</span>}
              </li>
            ))}
          </ul>
        )}

        {error && <Banner tone="danger">{error}</Banner>}

        <div className="flex flex-wrap items-center gap-4 border-t border-border-subtle pt-4">
          <button
            type="button"
            onClick={() => {
              if (voiceState === "ouvindo") { pauseListening(); return; }
              void startListening();
            }}
            disabled={voiceState === "processando"}
            className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
              voiceState === "ouvindo"
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : voiceState === "processando"
                  ? "border-border-strong bg-surface-muted text-fg-muted"
                  : "border-border-strong bg-surface text-[var(--foreground)] hover:border-brand-600"
            }`}
            aria-label={voiceState === "ouvindo" ? "Pausar gravação" : "Começar a falar"}
          >
            <MicIcon listening={voiceState === "ouvindo"} />
          </button>

          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)]">{current.label}</p>
            <p className="text-xs text-fg-muted">{current.sub}</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-fg-muted">
              <input type="checkbox" checked={continuousMode} onChange={(e) => setContinuousMode(e.target.checked)} />
              Modo contínuo
            </label>
            <Button size="sm" variant="secondary" onClick={finishSession} disabled={voiceState === "inativo"}>
              Encerrar
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MicIcon({ listening }: { listening: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="10" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0" opacity={listening ? 1 : 0.6} />
      <path d="M12 17v3" />
      <path d="M9 20h6" />
    </svg>
  );
}
