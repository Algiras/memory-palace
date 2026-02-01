import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONTS } from "../config";

const SMASHIN_FACTORS = [
  { letter: "S", name: "Substitute", desc: "Abstract → Concrete" },
  { letter: "M", name: "Movement", desc: "Add animation" },
  { letter: "A", name: "Absurd", desc: "Make impossible" },
  { letter: "S", name: "Sensory", desc: "All 5 senses" },
  { letter: "H", name: "Humor", desc: "Make it funny" },
  { letter: "I", name: "Interact", desc: "You're in the scene" },
  { letter: "N", name: "Numbers", desc: "Encode quantities" },
  { letter: "S", name: "Symbols", desc: "Visual puns" },
  { letter: "C", name: "Color", desc: "Vivid contrasts" },
  { letter: "O", name: "Oversize", desc: "Giant or tiny" },
  { letter: "P", name: "Position", desc: "Precise placement" },
  { letter: "E", name: "Emotion", desc: "Strong feelings" },
];

export const SmashinScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        padding: 60,
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
          marginBottom: 20,
        }}
      >
        <span style={{ color: COLORS.primary }}>SMASHIN SCOPE</span> Encoding
      </h2>
      <p
        style={{
          fontSize: 24,
          color: COLORS.textMuted,
          opacity: titleOpacity,
          marginBottom: 40,
        }}
      >
        12 factors that make memories unforgettable
      </p>

      {/* Factor grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 16,
          maxWidth: 1600,
        }}
      >
        {SMASHIN_FACTORS.map((factor, i) => {
          const delay = 20 + i * 8;
          const scale = spring({
            frame: frame - delay,
            fps,
            config: { damping: 12, stiffness: 100 },
          });
          const isActive = frame > delay + 30;

          return (
            <div
              key={i}
              style={{
                padding: 20,
                backgroundColor: isActive ? `${COLORS.primary}15` : COLORS.card,
                border: `2px solid ${isActive ? COLORS.primary : COLORS.cardBorder}`,
                borderRadius: 16,
                transform: `scale(${Math.max(0, scale)})`,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 800,
                  color: COLORS.primary,
                  fontFamily: FONTS.mono,
                  marginBottom: 8,
                }}
              >
                {factor.letter}
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: COLORS.text,
                  marginBottom: 4,
                }}
              >
                {factor.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.textMuted,
                }}
              >
                {factor.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Score indicator */}
      <div
        style={{
          marginTop: 40,
          display: "flex",
          alignItems: "center",
          gap: 20,
          opacity: interpolate(frame, [140, 160], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: COLORS.primary,
            fontFamily: FONTS.mono,
          }}
        >
          12/12
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 24, color: COLORS.text, fontWeight: 600 }}>
            Maximum Score
          </div>
          <div style={{ fontSize: 18, color: COLORS.success }}>
            → 89% Recall@1 (vs 72% baseline)
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
