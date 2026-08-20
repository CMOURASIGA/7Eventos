import type { SVGProps } from "react";

/** Ícones outline minimalistas (sem dependência externa) usados na navegação. */
const common: SVGProps<SVGSVGElement> = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const ICONS: Record<string, (props?: SVGProps<SVGSVGElement>) => React.JSX.Element> = {
  dashboard: (p) => (
    <svg {...common} {...p}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  calendar: (p) => (
    <svg {...common} {...p}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </svg>
  ),
  events: (p) => (
    <svg {...common} {...p}>
      <path d="M4 4h16v16H4z" />
      <path d="M8 2.5v4M16 2.5v4M4 10h16" />
      <path d="M9 14.5l1.8 1.8L15.5 12" />
    </svg>
  ),
  spaces: (p) => (
    <svg {...common} {...p}>
      <path d="M3 21V9l9-6 9 6v12" />
      <path d="M9 21v-8h6v8" />
    </svg>
  ),
  reservations: (p) => (
    <svg {...common} {...p}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18" />
      <path d="M8 14h3M8 17h6" />
    </svg>
  ),
  reports: (p) => (
    <svg {...common} {...p}>
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  ),
  audit: (p) => (
    <svg {...common} {...p}>
      <path d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5l-8-3Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  users: (p) => (
    <svg {...common} {...p}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c1-3.5 3.6-5.5 6.5-5.5s5.5 2 6.5 5.5" />
      <circle cx="17.5" cy="8.5" r="2.6" />
      <path d="M15.8 14.8c2.4.3 4.3 2.1 5.2 5.2" />
    </svg>
  ),
  logout: (p) => (
    <svg {...common} {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  ),
  chevronDown: (p) => (
    <svg {...common} {...p}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  plus: (p) => (
    <svg {...common} {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  search: (p) => (
    <svg {...common} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
};
