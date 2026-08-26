/**
 * Marca "C" da Consult Services (traço em circuito, dois arcos
 * concêntricos abertos à direita com uma trilha em escada e nós nos
 * terminais) — usada no lugar do "7" genérico no topo da sidebar.
 *
 * Recriada em SVG a partir da arte fornecida pelo usuário (não há um
 * arquivo de logo no repositório para importar diretamente); usa as
 * mesmas cores do design system (--brand-600/--brand-500), que já são
 * o azul institucional da Consult Services.
 */
export function ConsultServicesMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Consult Services">
      {/* Arco externo (marinho) */}
      <path
        d="M62 20 A34 34 0 1 0 62 80"
        fill="none"
        stroke="var(--brand-600)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Arco interno (azul claro) */}
      <path
        d="M58 32 A22 22 0 1 0 58 68"
        fill="none"
        stroke="var(--brand-500)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Trilha em escada — do canto inferior esquerdo ao superior direito */}
      <path
        d="M28 62 L44 62 L52 54 L68 54 L76 46"
        fill="none"
        stroke="var(--brand-500)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Nós (terminais) */}
      <circle cx="62" cy="20" r="5" fill="var(--brand-600)" />
      <circle cx="62" cy="80" r="5" fill="var(--brand-600)" />
      <circle cx="58" cy="32" r="4" fill="var(--brand-500)" />
      <circle cx="58" cy="68" r="4" fill="var(--brand-500)" />
      <circle cx="76" cy="46" r="4.5" fill="var(--brand-400)" />
      <circle cx="28" cy="62" r="3.5" fill="var(--brand-300)" />
    </svg>
  );
}
