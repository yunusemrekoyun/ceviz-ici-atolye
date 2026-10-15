import QRCode from "qrcode";

export const QR_FILE_NAME = "galatasaray-futbol-okulu-on-kayit-qr.png";

/** Baskıya uygun yüksek çözünürlüklü QR PNG (2048px, hata düzeltme seviyesi H). */
export async function buildQrPng(content: string): Promise<Buffer> {
  return QRCode.toBuffer(content, {
    type: "png",
    width: 2048,
    margin: 4,
    errorCorrectionLevel: "H",
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
}

/** Sayfa içine gömülecek SVG QR (herkese açık sayfalar için; PNG uç noktası yalnız yöneticiye açık). */
export async function buildQrSvg(content: string): Promise<string> {
  return QRCode.toString(content, {
    type: "svg",
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#1a1a1aff", light: "#ffffffff" },
  });
}
