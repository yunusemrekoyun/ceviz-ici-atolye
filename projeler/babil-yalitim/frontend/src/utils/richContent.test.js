import { describe, expect, it } from "vitest";
import {
  buildRichContentHtml,
  getYouTubeEmbedUrl,
  toPlainRichContent,
  toEditableRichContent,
  toRichContentExcerpt,
} from "./richContent";

describe("richContent utils", () => {
  it("youtube watch urlini embed urline cevirir", () => {
    expect(
      getYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    ).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("tek satir url blog icerigini linke cevirir", () => {
    expect(buildRichContentHtml("https://ornek.com")).toContain(
      'href="https://ornek.com"'
    );
  });

  it("youtube iframe veya url satirini iframe block olarak uretir", () => {
    const html = buildRichContentHtml(
      "Giris metni\n\nhttps://youtu.be/dQw4w9WgXcQ"
    );

    expect(html).toContain("<p>Giris metni</p>");
    expect(html).toContain("<iframe");
    expect(html).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("markdown link blog icerigini anchor block olarak uretir", () => {
    expect(buildRichContentHtml("[Teklif Dosyasi](https://ornek.com/teklif)")).toContain(
      'href="https://ornek.com/teklif"'
    );
  });

  it("saklanan paragraf htmlini tekrar editlenebilir duz metne cevirir", () => {
    expect(
      toEditableRichContent(
        "<p>Ilk satir<br />Ikinci satir</p>\n<p>Son paragraf</p>"
      )
    ).toBe("Ilk satir\nIkinci satir\n\nSon paragraf");
  });

  it("saklanan link ve youtube bloklarini tekrar editlenebilir formata cevirir", () => {
    expect(
      toEditableRichContent(
        '<p><a href="https://ornek.com/teklif" target="_blank" rel="noopener noreferrer">Teklif Dosyasi</a></p>\n<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe>'
      )
    ).toBe(
      "[Teklif Dosyasi](https://ornek.com/teklif)\n\nhttps://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    );
  });

  it("desteklenmeyen zengin html bloklarini oldugu gibi birakir", () => {
    expect(toEditableRichContent("<h2>Baslik</h2><p>Metin</p>")).toBe(
      "<h2>Baslik</h2><p>Metin</p>"
    );
  });

  it("rich content htmlini plain text ozete cevirir", () => {
    expect(
      toPlainRichContent(
        '<p>Guncel yonetmelik asagidadir.</p><p><a href="https://ornek.com/dosya">Dosyayi goruntule</a></p>'
      )
    ).toBe("Guncel yonetmelik asagidadir.\nDosyayi goruntule");
  });

  it("excerpt helper html taglerini gostermeden kirpar", () => {
    expect(
      toRichContentExcerpt(
        "<p>Su yalitimi metni</p><p>Devam eden ikinci uzun paragraf</p>",
        24
      )
    ).toBe("Su yalitimi metni Devam…");
  });
});
