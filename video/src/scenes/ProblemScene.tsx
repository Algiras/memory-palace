import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONTS } from "../config";

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Problem cards animation
  const card1Scale = spring({ frame: frame - 20, fps, config: { damping: 12 } });
  const card2Scale = spring({ frame: frame - 40, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: 100,
        background: COLORS.backgroundGradient,
      }}
    >
      {/* Title */}
      <h2
        style={{
          position: "absolute",
          top: 100,
          fontSize: 64,
          fontWeight: 700,
          color: COLORS.text,
          opacity: titleOpacity,
          fontFamily: FONTS.heading,
        }}
      >
        The Problem with LLM Memory
      </h2>

      {/* Problem cards */}
      <div
        style={{
          display: "flex",
          gap: 80,
          marginTop: 50,
        }}
      >
        {/* Card 1: Forgetting */}
        <div
          style={{
            width: 400,
            padding: 40,
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.cardBorder}`,
            borderRadius: 24,
            transform: `scale(${Math.max(0, card1Scale)})`,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              backgroundColor: `${COLORS.danger}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 48 }}>🧠</span>
          </div>
          <h3
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: COLORS.danger,
              marginBottom: 16,
            }}
          >
            Context Overflow
          </h3>
          <p style={{ fontSize: 20, color: COLORS.textMuted, lineHeight: 1.6 }}>
            LLMs load entire documents into context, exhausting token limits quickly.
            <br />
            <br />
            <span style={{ color: COLORS.danger, fontWeight: 600 }}>
              500KB+ per query at scale
            </span>
          </p>
        </div>

        {/* Card 2: Hallucination */}
        <div
          style={{
            width: 400,
            padding: 40,
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.cardBorder}`,
            borderRadius: 24,
            transform: `scale(${Math.max(0, card2Scale)})`,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              backgroundColor: `${COLORS.accent}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 48 }}>👻</span>
          </div>
          <h3
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: COLORS.accent,
              marginBottom: 16,
            }}
          >
            Hallucination
          </h3>
          <p style={{ fontSize: 20, color: COLORS.textMuted, lineHeight: 1.6 }}>
            Models confidently generate false information with no grounding check.
            <br />
            <br />
            <span style={{ color: COLORS.accent, fontWeight: 600 }}>
              40% undetected fabrications
            </span>
          </p>
        </div>
      </div>

      {/* Arrow to solution */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          opacity: interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <span style={{ fontSize: 24, color: COLORS.textMuted }}>
          We need a better approach →
        </span>
      </div>
    </AbsoluteFill>
  );
};
