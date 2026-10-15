import { describe, expect, it } from "vitest";
import { buildPageMeta } from "./seo";

describe("buildPageMeta", () => {
  it("anasayfa metalarini uretir", () => {
    const meta = buildPageMeta("/", "https://example.com");

    expect(meta.title).toMatch(/Su Yalitimi ve Yapi Koruma Sistemleri/);
    expect(meta.canonical).toBe("https://example.com/");
  });

  it("iletisim sayfasini turkce slug ile tanir", () => {
    const meta = buildPageMeta("/iletisim", "https://example.com");

    expect(meta.title).toMatch(/Iletisim/);
    expect(meta.description).toMatch(/teklif/i);
  });
});
