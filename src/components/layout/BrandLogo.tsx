import type { Company } from "@/lib/domain/types";

export function BrandLogo({ company, compact = false }: { company: Company | null; compact?: boolean }) {
  const logoUrl = company?.configuracoes.logoUrl;
  if (logoUrl) {
    return (
      // URL administrada pela própria empresa. A tag preserva suporte a logos whitelabel remotas sem lista global de hosts.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`Logo ${company.configuracoes.nomeExibido ?? company.nomeFantasia}`}
        className={compact ? "max-h-12 max-w-full object-contain" : "max-h-24 max-w-full object-contain"}
      />
    );
  }
  return <span aria-label="7Eventos">7</span>;
}
