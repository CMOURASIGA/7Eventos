import { generateSeed, type SeedData } from "./seed";

/**
 * Estado em memória do ambiente de demonstração (DATA_MODE=mock).
 *
 * Guardado em `globalThis` para sobreviver a hot-reload do Next.js em
 * desenvolvimento. Reiniciar o processo do servidor sempre volta ao
 * estado inicial gerado por `generateSeed()` — comportamento esperado
 * para o ambiente de demonstração (branch `develop`).
 */

declare global {
  var __eventosMockStore: SeedData | undefined;
}

export function getStore(): SeedData {
  if (!globalThis.__eventosMockStore) {
    globalThis.__eventosMockStore = generateSeed();
  }
  return globalThis.__eventosMockStore;
}

/** Restaura a base de demonstração ao estado inicial (usado pela ação "Restaurar dados de demonstração"). */
export function resetStore(): SeedData {
  globalThis.__eventosMockStore = generateSeed();
  return globalThis.__eventosMockStore;
}

let counter = 1;
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}
