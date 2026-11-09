import { ImageResponse } from "next/og";

export const alt = "Temper: a 120 day discipline system shown as a tempered steel blade";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The oxide temper colors on blued steel (dark theme values).
const RAMP = ["#25292f", "#e9d9a6", "#d6b062", "#b0773a", "#94557a", "#7457ad", "#3f73d1"];

// A deterministic illustrative blade: a run of worked days that heat up over time, then
// the untouched future. Brand art, not anyone's real record.
function bandAt(i: number): number {
  if (i >= 84) return 0;
  const wave = (Math.sin(i * 1.7) + Math.sin(i * 0.31)) * 0.5;
  const trend = i / 84;
  const v = Math.round(1.5 + trend * 4 + wave * 1.4);
  return Math.max(1, Math.min(6, v));
}

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#0D0E10",
          color: "#ECEDEF",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 168, fontWeight: 800, letterSpacing: "-0.06em", lineHeight: 0.9 }}>
            Temper
          </div>
          <div style={{ fontSize: 36, color: "#8B9097", marginTop: 28, maxWidth: 820, lineHeight: 1.25 }}>
            120 days. Every day of work heats the bar, and the record keeps its color.
          </div>
        </div>

        <div style={{ display: "flex", gap: 3, height: 120 }}>
          {Array.from({ length: 120 }, (_, i) => (
            <div key={i} style={{ flex: 1, height: "100%", background: RAMP[bandAt(i)] }} />
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
