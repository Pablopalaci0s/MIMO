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
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontSize: 96, fontWeight: 700, color: "#171717", letterSpacing: -2 }}>MIMO</span>
          <svg
            width="72"
            height="67"
            viewBox="94 596 898 838"
            fill="none"
            stroke="#f98079"
            strokeWidth="33.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M596.982,1308.07C596.982,1308.07 769.564,1249.086 877.702,1029.534C877.702,1029.534 961.809,852.495 852.579,734.614C852.579,734.614 762.237,625.896 634.225,681.957C634.225,681.957 574.852,702.667 506.037,831.558C506.037,831.558 398.184,678.995 255.093,759.825C255.093,759.825 124.018,834.101 174.263,1025.253C174.263,1025.253 183.04,1126.346 386.154,1242.095C386.154,1242.095 516.036,1314.882 596.982,1308.07Z" />
            <path d="M427.676,1380.249C427.676,1380.249 489.937,1380.074 596.982,1308.07C596.982,1308.07 650.504,1404.279 761.918,1390.079" />
            <path
              d="M599.212,1287.434C599.212,1287.434 673.519,1234.666 661.135,1157.128C661.135,1157.128 653.058,1109.205 607.289,1104.359C607.289,1104.359 556.136,1099.513 553.444,1155.513C553.444,1155.513 549.136,1221.204 599.212,1287.434Z"
              transform="translate(-1.2575,1.2575)"
            />
          </svg>
        </div>
        <span style={{ fontSize: 34, color: "#525252" }}>Regalos para hacerle el día a alguien</span>
      </div>
    ),
    { ...size },
  );
}
