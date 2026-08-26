import type { CSSProperties } from "react";
import type { Company } from "./domain/types";

const DEFAULT_PRIMARY = "#003b73";
const DEFAULT_SECONDARY = "#00aeef";
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function normalizeHexColor(value: string | undefined, fallback: string): string {
  return value && HEX_COLOR.test(value) ? value.toLowerCase() : fallback;
}

export function isValidBrandColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

export function isValidLogoUrl(value: string): boolean {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function brandingStyle(company: Company | null): CSSProperties {
  const primary = normalizeHexColor(company?.configuracoes.corPrimaria, DEFAULT_PRIMARY);
  const secondary = normalizeHexColor(company?.configuracoes.corSecundaria, DEFAULT_SECONDARY);
  return {
    "--brand-50": `color-mix(in srgb, ${secondary} 12%, white)`,
    "--brand-100": `color-mix(in srgb, ${secondary} 20%, white)`,
    "--brand-200": `color-mix(in srgb, ${secondary} 34%, white)`,
    "--brand-300": `color-mix(in srgb, ${secondary} 52%, white)`,
    "--brand-400": `color-mix(in srgb, ${secondary} 76%, white)`,
    "--brand-500": secondary,
    "--brand-600": primary,
    "--brand-700": `color-mix(in srgb, ${primary} 88%, black)`,
    "--brand-800": `color-mix(in srgb, ${primary} 76%, black)`,
    "--brand-900": `color-mix(in srgb, ${primary} 60%, black)`,
    "--sidebar": primary,
    "--sidebar-deep": `color-mix(in srgb, ${primary} 74%, black)`,
  } as CSSProperties;
}
