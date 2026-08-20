import { Card, Skeleton } from "@/components/ui/primitives";

/**
 * Estado de carregamento padrão para qualquer troca de rota dentro da
 * área autenticada. O App Router substitui o conteúdo por este
 * skeleton assim que a navegação começa, evitando a sensação de tela
 * travada/vazia enquanto os dados da nova página carregam.
 */
export default function AppLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label="Carregando conteúdo">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-6 w-12" />
          </Card>
        ))}
      </div>

      <Card>
        <div className="p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}
