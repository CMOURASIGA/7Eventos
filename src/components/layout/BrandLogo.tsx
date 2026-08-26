import type { Company } from "@/lib/domain/types";

export function BrandLogo({ company, compact = false }: { company: Company | null; compact?: boolean }) {
  const logoUrl = company?.configuracoes.logoUrl;
  if (logoUrl) {
    return (
      // URL administrada pela própria empresa. A tag preserva suporte a logos whitelabel remotas sem lista global de hosts.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`Logo ${company.nomeFantasia}`}
        className={compact ? "h-8 w-8 object-contain" : "h-10 w-10 object-contain"}
      />
    );
  }
  return <span aria-label="7Eventos">7</span>;
}
