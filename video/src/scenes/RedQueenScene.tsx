import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONTS } from "../config";

const AGENTS = [
  { name: "Examiner", emoji: "🔍", desc: "Generate hard questions" },
  { name: "Learner", emoji: "🧠", desc: "Attempt blind recall" },
  { name: "Evaluator", emoji: "⚖️", desc: "Score accuracy" },
  { name: "Evolver", emoji: "🔧", desc: "Strengthen weak memories" },
];

export const RedQueenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Slower, smoother cycle rotation
  const cycleRotation = interpolate(frame, [0, 150], [0, 180]);

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
          top: 60,
          fontSize: 56,
          fontWeight: 700,
          color: COLORS.text,
          opacity: titleOpacity,
          fontFamily: FONTS.heading,
        }}
      >
        <span style={{ color: COLORS.danger }}>Red Queen</span> Protocol
      </h2>
      <p
        style={{
          position: "absolute",
          top: 140,
          fontSize: 20,
          color: COLORS.textMuted,
          fontStyle: "italic",
          opacity: titleOpacity,
        }}
      >
        "It takes all the running you can do, to keep in the same place."
        <span style={{ color: COLORS.textMuted, fontStyle: "normal" }}> — Lewis Carroll</span>
      </p>

      {/* Agent cycle */}
      <div
        style={{
          position: "relative",
          width: 500,
          height: 500,
          marginTop: 60,
        }}
      >
        {/* Center circle */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 120,
            height: 120,
            borderRadius: "50%",
            backgroundColor: `${COLORS.danger}20`,
            border: `3px solid ${COLORS.danger}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 48 }}>♛</span>
        </div>

        {/* Rotating ring */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) rotate(${cycleRotation}deg)`,
            width: 400,
            height: 400,
            border: `2px dashed ${COLORS.danger}40`,
            borderRadius: "50%",
          }}
        />

        {/* Agents */}
        {AGENTS.map((agent, i) => {
          const angle = (i * 90 - 90) * (Math.PI / 180);
          const radius = 180;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          const delay = 40 + i * 20;
          const scale = spring({
            frame: frame - delay,
            fps,
            config: { damping: 18, stiffness: 70 },
          });

          // Highlight current agent - slower cycle
          const isActive = Math.floor(((frame + 30) % 120) / 30) === i;

          return (
            <div
              key={agent.name}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${Math.max(0, scale)})`,
                width: 140,
                height: 140,
                backgroundColor: isActive ? `${COLORS.primary}20` : COLORS.card,
                border: `2px solid ${isActive ? COLORS.primary : COLORS.cardBorder}`,
                borderRadius: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
            >
              <span style={{ fontSize: 36, marginBottom: 8 }}>{agent.emoji}</span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: isActive ? COLORS.primary : COLORS.text,
                }}
              >
                {agent.name}
              </span>
              <span style={{ fontSize: 10, color: COLORS.textMuted, textAlign: "center" }}>
                {agent.desc}
              </span>
            </div>
          );
        })}

        {/* Connection arrows */}
        {[0, 1, 2, 3].map((i) => {
          const startAngle = (i * 90 - 45) * (Math.PI / 180);
          const x = 250 + Math.cos(startAngle) * 130;
          const y = 250 + Math.sin(startAngle) * 130;
          const rotation = i * 90 + 45;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                color: COLORS.danger,
                fontSize: 24,
                opacity: 0.6,
              }}
            >
              →
            </div>
          );
        })}
      </div>

      {/* Results */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          display: "flex",
          gap: 60,
          opacity: interpolate(frame, [120, 140], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.success }}>+23%</div>
          <div style={{ fontSize: 14, color: COLORS.textMuted }}>Retention (weak→strong)</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.primary }}>-37%</div>
          <div style={{ fontSize: 14, color: COLORS.textMuted }}>Fewer retrievals needed</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
