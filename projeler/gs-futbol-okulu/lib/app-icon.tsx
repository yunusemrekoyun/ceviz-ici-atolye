import { ImageResponse } from "next/og";

/** Uygulama ikonu: kırmızı zemin, sarı "GS" ve alt yazı. Harici font gerekmez. */
export function renderAppIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #c20a3d 0%, #86022a 100%)",
          color: "#fdb912",
          fontWeight: 800,
        }}
      >
        <div style={{ fontSize: size * 0.42, lineHeight: 1, letterSpacing: -size * 0.01 }}>GS</div>
        <div style={{ fontSize: size * 0.11, color: "#ffffff", marginTop: size * 0.03, letterSpacing: size * 0.01 }}>KÜTAHYA</div>
      </div>
    ),
    { width: size, height: size },
  );
}
