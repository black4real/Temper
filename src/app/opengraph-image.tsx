import { ImageResponse } from "next/og";

export const alt = "Ghost Mode — a 120-day discipline system";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0E0E10",
          color: "#F2F1EC",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 14,
            background: "#F97316",
            marginBottom: 40,
          }}
        />
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: "-0.03em" }}>Ghost Mode</div>
        <div style={{ fontSize: 36, color: "#9A988F", marginTop: 16 }}>
          A 120-day discipline system.
        </div>
        <div style={{ fontSize: 28, color: "#6E6C66", marginTop: 48 }}>
          Eight daily commitments. One record.
        </div>
      </div>
    ),
    { ...size },
  );
}
