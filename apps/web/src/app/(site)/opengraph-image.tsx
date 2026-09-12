import { ImageResponse } from "next/og";

// Imagen de vista previa por defecto cuando se comparte un link de MIMO
// (WhatsApp, Facebook, Twitter) — generada en el momento, no un archivo
// estático, así que nunca queda desactualizada. Las páginas de producto y
// negocio la pisan con su propia foto real (ver sus `generateMetadata`).
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
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
          gap: 24,
          backgroundColor: "#ffffff",
          backgroundImage: "radial-gradient(circle at 50% 0%, #fdeaee 0%, #ffffff 60%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 96, fontWeight: 700, color: "#171717", letterSpacing: -2 }}>MIMO</span>
          <span style={{ width: 18, height: 18, borderRadius: 9999, backgroundColor: "#cf3452" }} />
        </div>
        <span style={{ fontSize: 34, color: "#525252" }}>Regalos para hacerle el día a alguien</span>
      </div>
    ),
    { ...size },
  );
}
