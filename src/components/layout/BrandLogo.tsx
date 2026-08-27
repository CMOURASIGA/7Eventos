import type { Company } from "@/lib/domain/types";

export function BrandLogo({ company, compact = false }: { company: Company | null; compact?: boolean }) {
  const logoUrl = company?.configuracoes.logoUrl;
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`Logo ${company.configuracoes.nomeExibido ?? company.nomeFantasia}`}
        className={compact ? "max-h-12 max-w-full object-contain" : "max-h-[126px] max-w-[92%] object-contain object-center"}
      />
    );
  }
  return <span aria-label="7Eventos">7</span>;
}
