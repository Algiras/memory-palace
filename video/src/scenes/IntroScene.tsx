import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONTS } from "../config";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animations
  const titleScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const subtitleOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const iconRotation = interpolate(frame, [0, 150], [0, 360]);

  // Palace icon elements animation
  const pillarScale = spring({ frame: frame - 20, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: COLORS.backgroundGradient,
      }}
    >
      {/* Animated background grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0,212,170,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,170,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          transform: `perspective(500px) rotateX(60deg) translateY(${frame * 0.5}px)`,
          transformOrigin: "center top",
        }}
      />

      {/* Palace Icon */}
      <div
        style={{
          position: "absolute",
          top: 200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `scale(${Math.max(0, pillarScale)})`,
        }}
      >
        {/* Roof */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "100px solid transparent",
            borderRight: "100px solid transparent",
            borderBottom: `60px solid ${COLORS.primary}`,
            marginBottom: -5,
          }}
        />
        {/* Pillars */}
        <div style={{ display: "flex", gap: 40 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 24,
                height: 100,
                backgroundColor: COLORS.primary,
                borderRadius: 4,
                opacity: interpolate(frame, [30 + i * 10, 40 + i * 10], [0, 1], {
                  extrapolateRight: "clamp",
                }),
              }}
            />
          ))}
        </div>
        {/* Base */}
        <div
          style={{
            width: 200,
            height: 20,
            backgroundColor: COLORS.primary,
            borderRadius: 4,
            marginTop: -5,
          }}
        />
      </div>

      {/* Title */}
      <div
        style={{
          marginTop: 150,
          textAlign: "center",
          transform: `scale(${titleScale})`,
        }}
      >
        <h1
          style={{
            fontSize: 120,
            fontWeight: 800,
            fontFamily: FONTS.heading,
            color: COLORS.text,
            margin: 0,
            letterSpacing: "-0.02em",
            textShadow: `0 0 60px ${COLORS.primary}40`,
          }}
        >
          Memory Palace
        </h1>
        <p
          style={{
            fontSize: 36,
            color: COLORS.textMuted,
            marginTop: 20,
            opacity: subtitleOpacity,
            fontWeight: 400,
          }}
        >
          Ancient Wisdom Meets Modern AI
        </p>
      </div>

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => {
        const delay = i * 5;
        const x = (i % 5) * 400 - 800;
        const baseY = 800 - (i * 50) % 600;
        const y = baseY - ((frame + delay) % 200) * 2;
        const opacity = interpolate(y, [100, 300, 700, 800], [0, 0.5, 0.5, 0]);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 960 + x,
              top: y,
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: COLORS.primary,
              opacity: Math.max(0, opacity),
              filter: "blur(2px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
