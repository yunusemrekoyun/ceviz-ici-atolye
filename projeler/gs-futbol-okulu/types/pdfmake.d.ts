// pdfmake 0.3 kendi tiplerini getirmiyor; kullandığımız kadarı.
declare module "pdfmake" {
  type Fonts = Record<string, { normal: string; bold: string; italics: string; bolditalics: string }>;
  const pdfmake: {
    setFonts(fonts: Fonts): void;
    setUrlAccessPolicy(fn: (url: string) => boolean): void;
    setLocalAccessPolicy(fn: (path: string) => boolean): void;
    createPdf(doc: Record<string, unknown>): { getBuffer(): Promise<Buffer> };
  };
  export default pdfmake;
}
