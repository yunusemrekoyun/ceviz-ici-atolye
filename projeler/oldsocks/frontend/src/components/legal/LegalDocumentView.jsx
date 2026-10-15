import React from "react";

// Düz metin: boş satır paragraf ayırır, "# " ile başlayan satır başlık olur.
export function LegalBody({ body }) {
  const blocks = String(body || "").split(/\n{2,}/);
  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-dark2">
      {blocks.map((block, i) => {
        const text = block.trim();
        if (!text) return null;
        if (text.startsWith("# ")) {
          const [heading, ...rest] = text.split("\n");
          return (
            <div key={i} className="space-y-2">
              <h2 className="text-xl font-semibold text-dark1">{heading.slice(2).trim()}</h2>
              {rest.length > 0 && <p className="whitespace-pre-line">{rest.join("\n")}</p>}
            </div>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {text}
          </p>
        );
      })}
    </div>
  );
}

export default function LegalDocumentView({ doc }) {
  const date = doc?.publishedAt ? new Date(doc.publishedAt).toLocaleDateString("tr-TR") : "";
  return (
    <main className="bg-light1 text-dark1 min-h-screen">
      <div className="bg-dark1 text-white">
        <div className="container mx-auto px-4 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-4xl font-bold">{doc.title}</h1>
          {date && <p className="mt-2 text-white/80">Güncelleme tarihi: {date}</p>}
        </div>
      </div>
      <div className="container mx-auto px-4 py-10">
        <article className="mx-auto max-w-3xl rounded-2xl border border-light2 bg-white p-6 sm:p-10 shadow-sm">
          <LegalBody body={doc.body} />
        </article>
      </div>
    </main>
  );
}
