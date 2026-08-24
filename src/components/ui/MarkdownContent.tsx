"use client";

/**
 * Renderizador de markdown leve para as respostas do Atlas (chat, Voice
 * Room) — sem biblioteca externa, mesmo padrão usado em produção no
 * 7Commander_oficial (components/ui/markdown-content.tsx). Monta
 * elementos React diretamente a partir do texto (nunca
 * dangerouslySetInnerHTML), então não há risco de injeção de HTML pelo
 * conteúdo gerado pelo modelo — só o subconjunto de markdown reconhecido
 * abaixo vira formatação, o resto permanece texto simples.
 *
 * Cobre o que o Atlas realmente usa: negrito, código inline, links,
 * títulos, listas (ordenadas/não ordenadas) e citação — suficiente para
 * as respostas de chat/resumo, sem o peso de uma lib de markdown completa.
 */

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "blockquote"; text: string };

function renderInline(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);

  return tokens.map((token, index) => {
    if (!token) return null;

    const boldMatch = token.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch) return <strong key={index}>{boldMatch[1]}</strong>;

    const codeMatch = token.match(/^`([^`]+)`$/);
    if (codeMatch) {
      return (
        <code key={index} className="px-1 py-0.5 rounded bg-surface-muted text-xs font-mono">
          {codeMatch[1]}
        </code>
      );
    }

    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a key={index} href={linkMatch[2]} target="_blank" rel="noreferrer" className="text-brand-700 underline hover:text-brand-800">
          {linkMatch[1]}
        </a>
      );
    }

    return <span key={index}>{token}</span>;
  });
}

/** Só o inline (negrito/código/link), sem quebrar em blocos — para linha única (item de lista, campo curto). */
export function InlineMarkdown({ text }: { text: string }) {
  return <>{renderInline(text)}</>;
}

function parseMarkdown(content: string): Block[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const blocks: Block[] = [];
  let paragraphBuffer: string[] = [];
  let unorderedItems: string[] = [];
  let orderedItems: string[] = [];

  function flushParagraph() {
    if (!paragraphBuffer.length) return;
    blocks.push({ type: "paragraph", text: paragraphBuffer.join(" ").trim() });
    paragraphBuffer = [];
  }
  function flushUnorderedList() {
    if (!unorderedItems.length) return;
    blocks.push({ type: "unordered-list", items: unorderedItems });
    unorderedItems = [];
  }
  function flushOrderedList() {
    if (!orderedItems.length) return;
    blocks.push({ type: "ordered-list", items: orderedItems });
    orderedItems = [];
  }
  function flushAll() {
    flushParagraph();
    flushUnorderedList();
    flushOrderedList();
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushAll();
      blocks.push({ type: "heading", level: headingMatch[1].length, text: headingMatch[2].trim() });
      continue;
    }

    // O modelo frequentemente usa "**Rótulo**" sozinho numa linha como
    // pseudo-título, sem "#" e sem linha em branco separando do parágrafo
    // anterior (visto na prática: "...disponíveis.\n**Fatos**\n- item").
    // Sem este caso, a linha colaria no parágrafo anterior via
    // flushParagraph() abaixo, em vez de virar um título próprio.
    const boldLineMatch = trimmed.match(/^\*\*([^*]+)\*\*$/);
    if (boldLineMatch) {
      flushAll();
      blocks.push({ type: "heading", level: 4, text: boldLineMatch[1].trim() });
      continue;
    }

    const blockquoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (blockquoteMatch) {
      flushAll();
      blocks.push({ type: "blockquote", text: blockquoteMatch[1].trim() });
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      flushOrderedList();
      unorderedItems.push(unorderedMatch[1].trim());
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      flushUnorderedList();
      orderedItems.push(orderedMatch[1].trim());
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushAll();
  return blocks;
}

const HEADING_CLASS: Record<number, string> = {
  3: "text-sm font-semibold mt-2 mb-1",
  4: "text-sm font-semibold mt-2 mb-1",
  5: "text-sm font-medium mt-1.5 mb-0.5",
  6: "text-sm font-medium mt-1.5 mb-0.5",
};

export function MarkdownContent({ content, className = "" }: { content: string; className?: string }) {
  const blocks = parseMarkdown(content);

  return (
    <div className={`space-y-2 [&>*:first-child]:mt-0 ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const level = Math.min(block.level + 2, 6);
          const Tag = (level === 3 ? "h3" : level === 4 ? "h4" : level === 5 ? "h5" : "h6") as "h3" | "h4" | "h5" | "h6";
          return (
            <Tag key={index} className={HEADING_CLASS[level]}>
              {renderInline(block.text)}
            </Tag>
          );
        }
        if (block.type === "unordered-list") {
          return (
            <ul key={index} className="list-disc list-inside space-y-0.5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "ordered-list") {
          return (
            <ol key={index} className="list-decimal list-inside space-y-0.5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }
        if (block.type === "blockquote") {
          return (
            <blockquote key={index} className="border-l-2 border-border-strong pl-3 text-fg-muted italic">
              {renderInline(block.text)}
            </blockquote>
          );
        }
        return <p key={index}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}
