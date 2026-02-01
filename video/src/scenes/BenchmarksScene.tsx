import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONTS } from "../config";

const BENCHMARKS = [
  { name: "Google Gecko", score: 66.3, params: "1.2B", color: "#4285f4" },
  { name: "OpenAI 3-large", score: 64.6, params: "?", color: "#10a37f" },
  { name: "BGE-M3 (BAAI)", score: 63.5, params: "570M", color: "#ff6b35" },
  { name: "GTE-Qwen2", score: 62.8, params: "1.5B", color: "#ff4081" },
  { name: "Memory Palace", score: 56.0, params: "0", color: COLORS.primary },
];

export const BenchmarksScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Find max for scaling
  const maxScore = Math.max(...BENCHMARKS.map((b) => b.score));

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        padding: 80,
        background: COLORS.backgroundGradient,
      }}
    >
      {/* Title */}
      <h2
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: COLORS.text,
          opacity: titleOpacity,
          fontFamily: FONTS.heading,
          marginBottom: 10,
        }}
      >
        MTEB Benchmark Results
      </h2>
      <p
        style={{
          fontSize: 20,
          color: COLORS.textMuted,
          opacity: titleOpacity,
          marginBottom: 50,
        }}
      >
        Competitive performance with zero trainable parameters
      </p>

      {/* Bar chart */}
      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {BENCHMARKS.map((benchmark, i) => {
          const delay = 30 + i * 15;
          const barWidth = spring({
            frame: frame - delay,
            fps,
            config: { damping: 15, stiffness: 80 },
          });

          const isMemoryPalace = benchmark.name === "Memory Palace";
          const width = (benchmark.score / maxScore) * 100 * barWidth;

          return (
            <div
              key={benchmark.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
              }}
            >
              {/* Label */}
              <div
                style={{
                  width: 180,
                  fontSize: 18,
                  fontWeight: isMemoryPalace ? 700 : 500,
                  color: isMemoryPalace ? COLORS.primary : COLORS.text,
                  textAlign: "right",
                }}
              >
                {benchmark.name}
              </div>

              {/* Bar */}
              <div
                style={{
                  flex: 1,
                  height: 50,
                  backgroundColor: COLORS.card,
                  borderRadius: 8,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${width}%`,
                    height: "100%",
                    backgroundColor: benchmark.color,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 20,
                    transition: "width 0.3s ease-out",
                  }}
                >
                  {width > 20 && (
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#fff",
                        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                      }}
                    >
                      {benchmark.score}%
                    </span>
                  )}
                </div>
              </div>

              {/* Params badge */}
              <div
                style={{
                  width: 80,
                  padding: "6px 12px",
                  backgroundColor: isMemoryPalace ? `${COLORS.primary}30` : COLORS.card,
                  border: `1px solid ${isMemoryPalace ? COLORS.primary : COLORS.cardBorder}`,
                  borderRadius: 20,
                  fontSize: 14,
                  fontWeight: 600,
                  color: isMemoryPalace ? COLORS.primary : COLORS.textMuted,
                  textAlign: "center",
                }}
              >
                {benchmark.params}
              </div>
            </div>
          );
        })}
      </div>

      {/* Key insight */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          padding: "20px 40px",
          backgroundColor: `${COLORS.primary}15`,
          border: `2px solid ${COLORS.primary}`,
          borderRadius: 16,
          opacity: interpolate(frame, [140, 160], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <span style={{ fontSize: 24, color: COLORS.text }}>
          <span style={{ fontWeight: 700, color: COLORS.primary }}>56% MTEB</span> with{" "}
          <span style={{ fontWeight: 700, color: COLORS.success }}>zero parameters</span> — only
          10% behind billion-parameter models
        </span>
      </div>
    </AbsoluteFill>
  );
};
