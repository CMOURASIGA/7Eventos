import type { Reservation, Space } from "./types";

/**
 * Regras de negócio RN02, RN03 e RN04 - Conflito de reserva, capacidade
 * e espaço inativo.
 *
 * A verificação de disponibilidade deve considerar empresa, espaço,
 * intervalo de data/hora, capacidade mínima, reservas conflitantes e
 * status ativo do espaço (docs/FASE_01_MVP.md, seção 10).
 *
 * Regra de sobreposição: início_existente < fim_novo AND fim_existente > início_novo.
 * Reservas canceladas não bloqueiam disponibilidade.
 */

export interface AvailabilityInput {
  space: Space;
  inicio: string; // ISO
  fim: string; // ISO
  quantidadePessoas?: number;
  /** Reservas já existentes para o mesmo espaço (qualquer status). */
  existingReservations: Reservation[];
  /** Ignorar esta reserva na checagem (edição de uma reserva existente). */
  ignoreReservationId?: string;
}

export type AvailabilityIssueCode =
  | "espaco_inativo"
  | "datas_invalidas"
  | "capacidade_insuficiente"
  | "conflito_horario";

export interface AvailabilityIssue {
  code: AvailabilityIssueCode;
  message: string;
  conflictingReservationIds?: string[];
}

export interface AvailabilityResult {
  available: boolean;
  issues: AvailabilityIssue[];
}

const ACTIVE_RESERVATION_STATUSES = new Set(["solicitada", "confirmada"]);

export function checkAvailability(input: AvailabilityInput): AvailabilityResult {
  const issues: AvailabilityIssue[] = [];

  // RN12 - data/hora final deve ser posterior à inicial.
  const inicio = new Date(input.inicio).getTime();
  const fim = new Date(input.fim).getTime();
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim <= inicio) {
    issues.push({
      code: "datas_invalidas",
      message: "A data/hora final deve ser posterior à data/hora inicial.",
    });
  }

  // RN04 - espaço inativo não recebe novas reservas.
  if (input.space.status !== "ativo") {
    issues.push({
      code: "espaco_inativo",
      message: `O espaço "${input.space.nome}" está inativo e não pode receber novas reservas.`,
    });
  }

  // RN03 - capacidade.
  if (
    input.quantidadePessoas != null &&
    input.quantidadePessoas > input.space.capacidade
  ) {
    issues.push({
      code: "capacidade_insuficiente",
      message: `A quantidade informada (${input.quantidadePessoas}) excede a capacidade do espaço (${input.space.capacidade}).`,
    });
  }

  // RN02 - conflito de horário.
  if (issues.every((i) => i.code !== "datas_invalidas")) {
    const conflicting = input.existingReservations.filter((reservation) => {
      if (reservation.id === input.ignoreReservationId) return false;
      if (reservation.spaceId !== input.space.id) return false;
      if (!ACTIVE_RESERVATION_STATUSES.has(reservation.status)) return false;

      const existingInicio = new Date(reservation.inicio).getTime();
      const existingFim = new Date(reservation.fim).getTime();

      return existingInicio < fim && existingFim > inicio;
    });

    if (conflicting.length > 0) {
      issues.push({
        code: "conflito_horario",
        message:
          "Já existe uma reserva confirmada ou solicitada para este espaço no período informado.",
        conflictingReservationIds: conflicting.map((r) => r.id),
      });
    }
  }

  return { available: issues.length === 0, issues };
}
