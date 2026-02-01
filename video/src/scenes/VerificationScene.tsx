import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONTS } from "../config";

export const VerificationScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Animation stages
  const memoryScale = spring({ frame: frame - 20, fps, config: { damping: 12 } });
  const responseScale = spring({ frame: frame - 50, fps, config: { damping: 12 } });
  const checkScale = spring({ frame: frame - 80, fps, config: { damping: 12 } });

  const tokenHighlight = interpolate(frame, [90, 100], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
        background: COLORS.backgroundGradient,
      }}
    >
      {/* Title */}
      <h2
        style={{
          position: "absolute",
          top: 80,
          fontSize: 56,
          fontWeight: 700,
          color: COLORS.text,
          opacity: titleOpacity,
          fontFamily: FONTS.heading,
        }}
      >
        Verification Tokens
      </h2>

      <div style={{ display: "flex", gap: 60, alignItems: "center" }}>
        {/* Memory with token */}
        <div
          style={{
            width: 400,
            padding: 30,
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.cardBorder}`,
            borderRadius: 16,
            transform: `scale(${Math.max(0, memoryScale)})`,
          }}
        >
          <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 10 }}>
            STORED MEMORY
          </div>
          <div style={{ fontSize: 18, color: COLORS.text, marginBottom: 20, lineHeight: 1.5 }}>
            Two-Phase Commit ensures atomic transactions across distributed nodes...
          </div>
          <div
            style={{
              padding: "8px 16px",
              backgroundColor: `${COLORS.primary}20`,
              border: `1px solid ${COLORS.primary}`,
              borderRadius: 8,
              display: "inline-block",
            }}
          >
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>verify_token: </span>
            <span
              style={{
                fontSize: 14,
                color: COLORS.primary,
                fontFamily: FONTS.mono,
                fontWeight: 600,
              }}
            >
              "47 couples frozen"
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div style={{ fontSize: 36, color: COLORS.textMuted }}>→</div>

        {/* LLM Response */}
        <div
          style={{
            width: 400,
            padding: 30,
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.cardBorder}`,
            borderRadius: 16,
            transform: `scale(${Math.max(0, responseScale)})`,
          }}
        >
          <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 10 }}>
            LLM RESPONSE
          </div>
          <div style={{ fontSize: 18, color: COLORS.text, marginBottom: 20, lineHeight: 1.5 }}>
            Two-Phase Commit works like{" "}
            <span
              style={{
                backgroundColor: `${COLORS.success}${Math.round(tokenHighlight * 50)}`,
                padding: "2px 4px",
                borderRadius: 4,
                color: tokenHighlight > 0.5 ? COLORS.success : COLORS.text,
                fontWeight: tokenHighlight > 0.5 ? 600 : 400,
              }}
            >
              47 couples frozen
            </span>{" "}
            at a wedding ceremony...
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              transform: `scale(${Math.max(0, checkScale)})`,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: COLORS.success,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "#000", fontSize: 20 }}>✓</span>
            </div>
            <span style={{ color: COLORS.success, fontWeight: 600 }}>
              Token verified - Response grounded
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          display: "flex",
          gap: 60,
          opacity: interpolate(frame, [120, 140], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: COLORS.primary }}>F1 = 0.92</div>
          <div style={{ fontSize: 18, color: COLORS.textMuted }}>Detection Accuracy</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: COLORS.success }}>600×</div>
          <div style={{ fontSize: 18, color: COLORS.textMuted }}>Cheaper than FActScore</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
