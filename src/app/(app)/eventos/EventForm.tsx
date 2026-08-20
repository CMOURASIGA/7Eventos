import type { EventEntity, Space, User } from "@/lib/domain/types";
import { EVENT_STATUS_LABELS } from "@/lib/domain/types";
import { CATEGORIAS, TEMATICAS } from "@/lib/domain/catalog";
import { Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";

export function EventForm({
  action,
  event,
  spaces,
  users,
  submitLabel,
  includeSessionFields,
}: {
  action: (formData: FormData) => void;
  event?: EventEntity;
  spaces: Space[];
  users: User[];
  submitLabel: string;
  includeSessionFields?: boolean;
}) {
  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader title="Informações gerais" />
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Título" htmlFor="titulo" required>
              <Input id="titulo" name="titulo" required maxLength={160} defaultValue={event?.titulo} />
            </Field>
          </div>
          <Field label="Temática" htmlFor="tematica">
            <Select id="tematica" name="tematica" defaultValue={event?.tematica ?? ""}>
              <option value="">Selecione</option>
              {TEMATICAS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Categoria" htmlFor="categoria" required>
            <Select id="categoria" name="categoria" required defaultValue={event?.categoria ?? ""}>
              <option value="" disabled>
                Selecione
              </option>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="status" required>
            <Select id="status" name="status" required defaultValue={event?.status ?? "rascunho"}>
              {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Responsável" htmlFor="responsavelId">
            <Select id="responsavelId" name="responsavelId" defaultValue={event?.responsavelId ?? ""}>
              <option value="">Eu mesmo</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Demandante" htmlFor="demandante" required>
            <Input id="demandante" name="demandante" required maxLength={160} defaultValue={event?.demandante} />
          </Field>
          <Field label="Contato do demandante" htmlFor="contatoDemandante">
            <Input id="contatoDemandante" name="contatoDemandante" defaultValue={event?.contatoDemandante} />
          </Field>

          {includeSessionFields && (
            <>
              <Field label="Início da sessão" htmlFor="sessaoInicio" required>
                <Input id="sessaoInicio" name="sessaoInicio" type="datetime-local" required />
              </Field>
              <Field label="Fim da sessão" htmlFor="sessaoFim" required>
                <Input id="sessaoFim" name="sessaoFim" type="datetime-local" required />
              </Field>
            </>
          )}

          <Field label="Frequência" htmlFor="frequencia">
            <Select id="frequencia" name="frequencia" defaultValue={event?.frequencia ?? "unico"}>
              <option value="unico">Único</option>
              <option value="diario">Diário</option>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
            </Select>
          </Field>

          <Field label="Tipo de localização" htmlFor="tipoLocalizacao">
            <Select id="tipoLocalizacao" name="tipoLocalizacao" defaultValue={event?.tipoLocalizacao ?? "interno"}>
              <option value="interno">Interno</option>
              <option value="externo">Externo</option>
            </Select>
          </Field>
          <Field label="Espaço" htmlFor="spaceId" hint="Apenas para localização interna">
            <Select id="spaceId" name="spaceId" defaultValue={event?.spaceId ?? ""}>
              <option value="">Nenhum</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} — {s.local}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Local" htmlFor="local">
            <Input id="local" name="local" defaultValue={event?.local} placeholder="Quando for espaço externo" />
          </Field>
          <Field label="Formato" htmlFor="formato">
            <Select id="formato" name="formato" defaultValue={event?.formato ?? "presencial"}>
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
              <option value="hibrido">Híbrido</option>
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Descrição" htmlFor="descricao">
              <Textarea id="descricao" name="descricao" defaultValue={event?.descricao} maxLength={1000} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input type="checkbox" name="estrategico" defaultChecked={event?.estrategico} className="rounded" />
            Evento estratégico
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input type="checkbox" name="previstoOrcamento" defaultChecked={event?.previstoOrcamento} className="rounded" />
            Previsto em orçamento
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader title="Detalhes e planejamento" />
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          <Field label="Escopo" htmlFor="escopo">
            <Input id="escopo" name="escopo" defaultValue={event?.escopo} />
          </Field>
          <Field label="Segmento" htmlFor="segmento">
            <Input id="segmento" name="segmento" defaultValue={event?.segmento} />
          </Field>
          <Field label="Classificação" htmlFor="classificacao">
            <Input id="classificacao" name="classificacao" defaultValue={event?.classificacao} />
          </Field>
          <Field label="Público-alvo" htmlFor="publicoAlvo">
            <Input id="publicoAlvo" name="publicoAlvo" defaultValue={event?.publicoAlvo} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Detalhes do planejamento" htmlFor="detalhesPlanejamento">
              <Textarea id="detalhesPlanejamento" name="detalhesPlanejamento" defaultValue={event?.detalhesPlanejamento} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Jornada do participante" htmlFor="jornadaParticipante">
              <Textarea id="jornadaParticipante" name="jornadaParticipante" defaultValue={event?.jornadaParticipante} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input type="checkbox" name="restrito" defaultChecked={event?.restrito} className="rounded" />
            Público restrito
          </label>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
