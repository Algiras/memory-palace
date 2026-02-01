import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONTS } from "../config";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const codeOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const linksOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: COLORS.backgroundGradient,
      }}
    >
      {/* Animated background particles */}
      {[...Array(30)].map((_, i) => {
        const x = (i % 6) * 350 - 875;
        const baseY = 900 - (i * 60) % 800;
        const y = baseY - ((frame + i * 10) % 300) * 2;
        const opacity = interpolate(y, [100, 400, 700, 900], [0, 0.3, 0.3, 0]);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 960 + x,
              top: y,
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: COLORS.primary,
              opacity: Math.max(0, opacity),
              filter: "blur(1px)",
            }}
          />
        );
      })}

      {/* Main content */}
      <div
        style={{
          textAlign: "center",
          transform: `scale(${scale})`,
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: COLORS.text,
            fontFamily: FONTS.heading,
            marginBottom: 20,
            letterSpacing: "-0.02em",
          }}
        >
          Get Started
        </h1>

        {/* Install command */}
        <div
          style={{
            padding: "20px 40px",
            backgroundColor: "#1e1e2e",
            border: `1px solid ${COLORS.cardBorder}`,
            borderRadius: 16,
            marginBottom: 40,
            opacity: codeOpacity,
          }}
        >
          <code
            style={{
              fontSize: 32,
              fontFamily: FONTS.mono,
              color: COLORS.primary,
            }}
          >
            npx skills add https://github.com/Algiras/memory-palace -s memory-palace -g -y
          </code>
        </div>

        {/* Links */}
        <div
          style={{
            display: "flex",
            gap: 40,
            justifyContent: "center",
            opacity: linksOpacity,
          }}
        >
          <div
            style={{
              padding: "12px 24px",
              backgroundColor: COLORS.card,
              border: `1px solid ${COLORS.cardBorder}`,
              borderRadius: 12,
            }}
          >
            <span style={{ fontSize: 18, color: COLORS.textMuted }}>📄 </span>
            <span style={{ fontSize: 18, color: COLORS.text }}>Paper</span>
          </div>
          <div
            style={{
              padding: "12px 24px",
              backgroundColor: COLORS.card,
              border: `1px solid ${COLORS.cardBorder}`,
              borderRadius: 12,
            }}
          >
            <span style={{ fontSize: 18, color: COLORS.textMuted }}>🔗 </span>
            <span style={{ fontSize: 18, color: COLORS.text }}>GitHub</span>
          </div>
          <div
            style={{
              padding: "12px 24px",
              backgroundColor: COLORS.card,
              border: `1px solid ${COLORS.cardBorder}`,
              borderRadius: 12,
            }}
          >
            <span style={{ fontSize: 18, color: COLORS.textMuted }}>📖 </span>
            <span style={{ fontSize: 18, color: COLORS.text }}>Docs</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          display: "flex",
          alignItems: "center",
          gap: 20,
          opacity: linksOpacity,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {/* Palace icon mini */}
          <div
            style={{
              width: 40,
              height: 40,
              backgroundColor: COLORS.primary,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 20 }}>🏛️</span>
          </div>
          <span style={{ fontSize: 20, fontWeight: 600, color: COLORS.text }}>Memory Palace</span>
        </div>
        <span style={{ color: COLORS.textMuted }}>|</span>
        <span style={{ fontSize: 16, color: COLORS.textMuted }}>
          Ancient Wisdom Meets Modern AI
        </span>
      </div>
    </AbsoluteFill>
  );
};
