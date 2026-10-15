import type { ReactNode } from "react";

/** **kalın** vurguları; HTML üretmez, metin olduğu gibi React'e verilir. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}

/**
 * Metin yönetimindeki basit biçim: "## Başlık", "- madde", **kalın**, boş satırla paragraf.
 * Bilerek küçük tutuldu: admin'in yazdığı metin güvenli ve öngörülebilir görünür.
 */
export function Markdown({ source, className = "" }: { source: string; className?: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join(" "))}</p>);
    if (list.length)
      blocks.push(
        <ul key={blocks.length} className="list-disc space-y-1 pl-5">
          {list.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>,
      );
    para = [];
    list = [];
  };
  for (const raw of source.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    const heading = /^#{1,4}\s+(.+)$/.exec(line);
    const item = /^[-*]\s+(.+)$/.exec(line);
    if (!line) flush();
    else if (heading) {
      flush();
      blocks.push(
        <h3 key={blocks.length} className="pt-2 text-base font-bold text-ink">
          {inline(heading[1] ?? "")}
        </h3>,
      );
    } else if (item) {
      if (para.length) flush();
      list.push(item[1] ?? "");
    } else {
      if (list.length) flush();
      para.push(line);
    }
  }
  flush();
  return <div className={`space-y-3 leading-relaxed ${className}`}>{blocks}</div>;
}
