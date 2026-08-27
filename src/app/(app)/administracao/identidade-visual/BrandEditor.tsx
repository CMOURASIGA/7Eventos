"use client";

import { useState, type ChangeEvent } from "react";
import type { Company } from "@/lib/domain/types";
import { updateBranding, restoreBranding } from "./actions";

const DEFAULT_PRIMARY = "#003b73";
const DEFAULT_HIGHLIGHT = "#00aeef";

type BrandState = {
  nomeExibido: string;
  logoUrl: string;
  corPrimaria: string;
  corSecundaria: string;
};

export function BrandEditor({ company }: { company: Company }) {
  const [brand, setBrand] = useState<BrandState>({
    nomeExibido: company.configuracoes.nomeExibido ?? company.nomeFantasia,
    logoUrl: company.configuracoes.logoUrl ?? "",
    corPrimaria: company.configuracoes.corPrimaria ?? DEFAULT_PRIMARY,
    corSecundaria: company.configuracoes.corSecundaria ?? DEFAULT_HIGHLIGHT,
  });
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");

  function update<K extends keyof BrandState>(key: K, value: BrandState[K]) {
    setBrand((current) => ({ ...current, [key]: value }));
  }

  async function selectLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("A imagem deve ter no máximo 5 MB.");
      return;
    }

    setFileName(file.name);
    setFileError("");
    const source = await readFile(file);
    const image = await loadImage(source);
    const logoUrl = resizeLogo(image);
    const [corPrimaria, corSecundaria] = extractPalette(image);
    setBrand((current) => ({
      ...current,
      logoUrl,
      ...(corPrimaria ? { corPrimaria } : {}),
      ...(corSecundaria ? { corSecundaria } : {}),
    }));
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-border bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">White label do cliente</p>
      <h2 className="mt-2 text-base font-semibold text-[var(--foreground)]">Identidade apresentada ao cliente</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-fg-muted">
        O 7Eventos permanece uma plataforma Consult Services. Ao enviar uma logo, as cores predominantes são sugeridas automaticamente e podem ser ajustadas antes de salvar.
      </p>

      <form action={updateBranding} className="mt-5 grid gap-5 lg:grid-cols-[180px_1fr]">
        <div className="flex min-h-36 items-center justify-center rounded-xl border border-border bg-white p-4">
          {brand.logoUrl ? (
            // A prévia aceita data URL gerada no navegador e URL persistida no Storage.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="Prévia da marca do cliente" className="max-h-28 max-w-full object-contain" />
          ) : (
            <span className="text-xs text-fg-muted">Sem logo</span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-[var(--foreground)]">
            Nome exibido
            <input name="nomeExibido" value={brand.nomeExibido} onChange={(event) => update("nomeExibido", event.target.value)} maxLength={80} required className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500" />
          </label>

          <label className="text-sm font-medium text-[var(--foreground)]">
            Logo do cliente
            <span className="mt-2 flex flex-wrap items-center gap-3">
              <span className="cursor-pointer rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white">Escolher arquivo</span>
              <span className="text-xs font-normal text-fg-muted">{fileName || "Nenhum arquivo selecionado"}</span>
            </span>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={selectLogo} className="sr-only" />
            {fileError && <span className="mt-2 block text-xs text-danger-700">{fileError}</span>}
          </label>

          <ColorField label="Cor principal" name="corPrimaria" value={brand.corPrimaria} onChange={(value) => update("corPrimaria", value)} />
          <ColorField label="Cor de destaque" name="corSecundaria" value={brand.corSecundaria} onChange={(value) => update("corSecundaria", value)} />
          <input type="hidden" name="logoUrl" value={brand.logoUrl} />
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
          <button type="submit" className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700">Salvar identidade do cliente</button>
          <button formAction={restoreBranding} formNoValidate type="submit" className="rounded-xl border border-border bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] hover:bg-surface-muted">Restaurar Consult Services</button>
          <span className="text-xs text-fg-muted">Disponível para os perfis autorizados a administrar a empresa.</span>
        </div>
      </form>

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Prévia do sistema</h3>
        <p className="mt-1 text-xs text-fg-muted">Representação do menu e da área principal antes de salvar.</p>
        <BrandWorkspacePreview brand={brand} />
      </div>
    </section>
  );
}

function BrandWorkspacePreview({ brand }: { brand: BrandState }) {
  return (
    <div className="mt-3 flex h-72 overflow-hidden rounded-2xl border border-border bg-surface-muted shadow-sm">
      <aside className="w-36 shrink-0 text-white sm:w-48" style={{ backgroundColor: brand.corPrimaria }}>
        <div className="flex h-20 items-center justify-center rounded-br-2xl bg-white p-3">
          {brand.logoUrl ? (
            // A prévia também precisa aceitar a data URL antes da gravação.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="Logo no menu da prévia" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[10px] text-fg-muted">Sua logo</span>
          )}
        </div>
        <div className="p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: brand.corSecundaria }}>7Eventos</p>
          <p className="mt-1 truncate text-[10px] font-semibold">Gestão de eventos</p>
          <div className="mt-4 space-y-1.5 text-[9px] font-semibold">
            {['Dashboard', 'Eventos', 'Participantes', 'Atlas'].map((item, index) => (
              <div key={item} className="rounded-lg px-2 py-1.5" style={index === 0 ? { backgroundColor: brand.corSecundaria, color: '#ffffff' } : undefined}>{item}</div>
            ))}
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-11 items-center border-b border-border bg-white px-4">
          <span className="truncate text-[9px] font-bold uppercase tracking-wider" style={{ color: brand.corPrimaria }}>{brand.nomeExibido || 'Sua empresa'}</span>
        </header>
        <main className="p-4">
          <section className="rounded-xl border border-border bg-white p-4">
            <h4 className="text-sm font-semibold text-[var(--foreground)]">Visão geral dos eventos</h4>
            <p className="mt-1 text-[9px] text-fg-muted">Acompanhe a operação e as próximas entregas.</p>
            <button type="button" tabIndex={-1} className="mt-3 rounded-lg px-3 py-2 text-[9px] font-semibold text-white" style={{ backgroundColor: brand.corPrimaria }}>Criar evento</button>
          </section>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {['Eventos', 'Confirmados', 'Em atenção'].map((item) => (
              <div key={item} className="rounded-xl border border-border bg-white p-3">
                <span className="text-[7px] uppercase text-fg-muted">{item}</span>
                <div className="mt-2 text-base font-semibold text-[var(--foreground)]">0</div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function ColorField({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-medium text-[var(--foreground)]">
      {label}
      <input type="color" name={name} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-12 w-full cursor-pointer rounded-xl border border-border bg-white p-1" />
    </label>
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível processar a imagem."));
    image.src = src;
  });
}

function resizeLogo(image: HTMLImageElement): string {
  const max = 72;
  const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", 0.72);
}

function extractPalette(image: HTMLImageElement): [string | undefined, string | undefined] {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 48;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [undefined, undefined];
  context.drawImage(image, 0, 0, 48, 48);
  const colors = new Map<string, number>();
  const data = context.getImageData(0, 0, 48, 48).data;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 180) continue;
    const rgb = [data[index], data[index + 1], data[index + 2]].map((value) => Math.min(255, Math.round(value / 32) * 32));
    if (Math.max(...rgb) > 235 && Math.min(...rgb) > 220) continue;
    const key = rgb.join(",");
    colors.set(key, (colors.get(key) ?? 0) + 1);
  }
  const palette = [...colors.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key.split(",").map(Number));
  const saturated = palette.filter(([red, green, blue]) => Math.max(red, green, blue) - Math.min(red, green, blue) > 55);
  return [saturated[0] ? toHex(saturated[0]) : undefined, saturated[1] ? toHex(saturated[1]) : undefined];
}

function toHex(color: number[]): string {
  return `#${color.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}
