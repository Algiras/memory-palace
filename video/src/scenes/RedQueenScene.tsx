import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from "remotion";
import { COLORS, FONTS } from "../config";

const AGENTS = [
  { name: "Examiner", icon: "🔍", desc: "Generate questions", color: "#f59e0b" },
  { name: "Learner", icon: "🧠", desc: "Blind recall", color: "#8b5cf6" },
  { name: "Evaluator", icon: "⚖️", desc: "Score accuracy", color: "#06b6d4" },
  { name: "Evolver", icon: "🔧", desc: "Strengthen", color: "#22c55e" },
];

// 3D Checkmark component
const Check3D: React.FC<{ progress: number; size?: number }> = ({ progress, size = 80 }) => {
  const scale = Math.max(0, progress);
  const rotateY = interpolate(progress, [0, 1], [-90, 0]);

  return (
    <div
      style={{
        width: size,
        height: size,
        perspective: 200,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${COLORS.success} 0%, #15803d 100%)`,
          boxShadow: `0 ${size/4}px ${size/2}px rgba(34, 197, 94, 0.4), inset 0 -${size/10}px ${size/5}px rgba(0,0,0,0.2)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `rotateY(${rotateY}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        <svg
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
        >
          <path
            d="M5 12l5 5L20 7"
            stroke="white"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={30}
            strokeDashoffset={interpolate(progress, [0.3, 1], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
          />
        </svg>
      </div>
    </div>
  );
};

// Animated particle for the "running" effect
const RunningParticle: React.FC<{ index: number; frame: number; radius: number }> = ({ index, frame, radius }) => {
  const speed = 0.02 + (index % 3) * 0.005;
  const offset = (index * 137.5) % 360; // Golden angle for distribution
  const angle = ((frame * speed * 180 / Math.PI) + offset) % 360;
  const rad = (angle * Math.PI) / 180;

  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;
  const opacity = 0.3 + Math.sin(frame * 0.1 + index) * 0.2;
  const size = 4 + (index % 3) * 2;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: COLORS.danger,
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
        opacity,
        boxShadow: `0 0 ${size * 2}px ${COLORS.danger}`,
      }}
    />
  );
};

// Flowing connection line between agents
const FlowingConnection: React.FC<{
  from: { x: number; y: number };
  to: { x: number; y: number };
  progress: number;
  isActive: boolean;
}> = ({ from, to, progress, isActive }) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <div
      style={{
        position: "absolute",
        left: from.x + 250,
        top: from.y + 250,
        width: length,
        height: 3,
        transform: `rotate(${angle}deg)`,
        transformOrigin: "0 50%",
        background: isActive
          ? `linear-gradient(90deg, ${COLORS.primary}00, ${COLORS.primary}, ${COLORS.primary}00)`
          : `linear-gradient(90deg, ${COLORS.danger}20, ${COLORS.danger}40, ${COLORS.danger}20)`,
        opacity: progress,
        borderRadius: 2,
      }}
    >
      {isActive && (
        <div
          style={{
            position: "absolute",
            width: 20,
            height: 3,
            background: COLORS.primary,
            borderRadius: 2,
            boxShadow: `0 0 10px ${COLORS.primary}`,
            left: `${((progress * 200) % 100)}%`,
          }}
        />
      )}
    </div>
  );
};

export const RedQueenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Smoother title animation
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 80 },
  });

  const quoteProgress = spring({
    frame: frame - 15,
    fps,
    config: { damping: 25, stiffness: 60 },
  });

  // Current active agent (cycles through)
  const cycleFrame = frame % 240;
  const activeIndex = Math.floor(cycleFrame / 60);

  // Agent positions
  const agentPositions = AGENTS.map((_, i) => {
    const angle = (i * 90 - 90) * (Math.PI / 180);
    const radius = 170;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });

  // Center pulse
  const pulse = 1 + Math.sin(frame * 0.08) * 0.05;

  // Show checkmark at the end of cycle
  const showCheck = cycleFrame > 220;
  const checkProgress = spring({
    frame: cycleFrame - 220,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Results animation
  const resultsProgress = spring({
    frame: frame - 280,
    fps,
    config: { damping: 20, stiffness: 60 },
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: COLORS.backgroundGradient,
        perspective: 1000,
      }}
    >
      {/* Subtle background grid with 3D effect */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 50% 50%, ${COLORS.danger}08 0%, transparent 70%),
            linear-gradient(rgba(239,68,68,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(239,68,68,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 50px 50px, 50px 50px",
          transform: `perspective(500px) rotateX(60deg) translateY(${frame * 0.3}px)`,
          transformOrigin: "center top",
          opacity: 0.5,
        }}
      />

      {/* Title with 3D depth */}
      <div
        style={{
          position: "absolute",
          top: 50,
          textAlign: "center",
          transform: `translateY(${(1 - titleProgress) * -30}px)`,
          opacity: titleProgress,
        }}
      >
        <h2
          style={{
            fontSize: 60,
            fontWeight: 800,
            fontFamily: FONTS.heading,
            margin: 0,
            textShadow: `0 4px 20px ${COLORS.danger}40`,
          }}
        >
          <span
            style={{
              color: COLORS.danger,
              textShadow: `0 0 40px ${COLORS.danger}60, 0 4px 20px ${COLORS.danger}40`,
            }}
          >
            Red Queen
          </span>{" "}
          <span style={{ color: COLORS.text }}>Protocol</span>
        </h2>
      </div>

      {/* Quote with fade */}
      <p
        style={{
          position: "absolute",
          top: 130,
          fontSize: 18,
          color: COLORS.textMuted,
          fontStyle: "italic",
          opacity: Math.max(0, quoteProgress),
          transform: `translateY(${(1 - Math.max(0, quoteProgress)) * 20}px)`,
          maxWidth: 600,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        "It takes all the running you can do, to keep in the same place."
        <br />
        <span style={{ fontStyle: "normal", fontSize: 14, opacity: 0.7 }}>
          — Lewis Carroll, Through the Looking-Glass
        </span>
      </p>

      {/* Main agent cycle container */}
      <div
        style={{
          position: "relative",
          width: 500,
          height: 500,
          marginTop: 40,
          transform: "translateZ(0)",
        }}
      >
        {/* Running particles */}
        {[...Array(12)].map((_, i) => (
          <RunningParticle key={i} index={i} frame={frame} radius={210 + (i % 3) * 15} />
        ))}

        {/* Outer glow ring */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${pulse})`,
            width: 420,
            height: 420,
            borderRadius: "50%",
            border: `1px solid ${COLORS.danger}20`,
            boxShadow: `0 0 60px ${COLORS.danger}10, inset 0 0 60px ${COLORS.danger}05`,
          }}
        />

        {/* Connection lines between agents */}
        {AGENTS.map((_, i) => {
          const nextI = (i + 1) % 4;
          const isActive = activeIndex === i;
          const lineProgress = spring({
            frame: frame - 50 - i * 15,
            fps,
            config: { damping: 20, stiffness: 80 },
          });

          return (
            <FlowingConnection
              key={`line-${i}`}
              from={agentPositions[i]}
              to={agentPositions[nextI]}
              progress={Math.max(0, lineProgress)}
              isActive={isActive}
            />
          );
        })}

        {/* Center crown with 3D effect */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${pulse})`,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: `radial-gradient(circle at 30% 30%, ${COLORS.danger}40, ${COLORS.danger}20)`,
            border: `2px solid ${COLORS.danger}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `
              0 0 30px ${COLORS.danger}30,
              0 10px 40px rgba(0,0,0,0.3),
              inset 0 -5px 20px rgba(0,0,0,0.2)
            `,
          }}
        >
          {showCheck ? (
            <Check3D progress={Math.max(0, checkProgress)} size={60} />
          ) : (
            <span
              style={{
                fontSize: 40,
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              }}
            >
              ♛
            </span>
          )}
        </div>

        {/* Agent cards with 3D transforms */}
        {AGENTS.map((agent, i) => {
          const pos = agentPositions[i];
          const delay = 60 + i * 25;

          const cardProgress = spring({
            frame: frame - delay,
            fps,
            config: { damping: 15, stiffness: 60 },
          });

          const isActive = activeIndex === i;
          const wasActive = activeIndex === (i + 3) % 4;

          // 3D tilt based on position
          const tiltX = pos.y > 0 ? 5 : -5;
          const tiltY = pos.x > 0 ? -5 : 5;

          // Glow intensity when active
          const glowIntensity = isActive ? 1 : 0;
          const activeScale = isActive ? 1.08 : 1;

          return (
            <div
              key={agent.name}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `
                  translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))
                  scale(${Math.max(0, cardProgress) * activeScale})
                  perspective(500px)
                  rotateX(${tiltX}deg)
                  rotateY(${tiltY}deg)
                `,
                width: 130,
                height: 130,
                borderRadius: 20,
                background: isActive
                  ? `linear-gradient(135deg, ${agent.color}30, ${agent.color}10)`
                  : `linear-gradient(135deg, ${COLORS.card}, rgba(255,255,255,0.02))`,
                border: `2px solid ${isActive ? agent.color : COLORS.cardBorder}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: isActive
                  ? `0 0 30px ${agent.color}40, 0 10px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)`
                  : `0 10px 40px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)`,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* Icon with glow */}
              <div
                style={{
                  fontSize: 36,
                  marginBottom: 8,
                  filter: isActive ? `drop-shadow(0 0 10px ${agent.color})` : "none",
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                  transition: "all 0.3s ease",
                }}
              >
                {agent.icon}
              </div>

              {/* Name */}
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: isActive ? agent.color : COLORS.text,
                  transition: "color 0.3s ease",
                }}
              >
                {agent.name}
              </span>

              {/* Description */}
              <span
                style={{
                  fontSize: 10,
                  color: COLORS.textMuted,
                  textAlign: "center",
                  marginTop: 2,
                }}
              >
                {agent.desc}
              </span>

              {/* Active indicator dot */}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    bottom: -8,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: agent.color,
                    boxShadow: `0 0 10px ${agent.color}`,
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Directional arrows */}
        {AGENTS.map((_, i) => {
          const angle = (i * 90 + 45) * (Math.PI / 180);
          const radius = 135;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const rotation = i * 90 + 45;
          const isActive = activeIndex === i;

          const arrowProgress = spring({
            frame: frame - 80 - i * 10,
            fps,
            config: { damping: 20, stiffness: 100 },
          });

          return (
            <div
              key={`arrow-${i}`}
              style={{
                position: "absolute",
                left: 250 + x,
                top: 250 + y,
                transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${Math.max(0, arrowProgress)})`,
                fontSize: 20,
                color: isActive ? COLORS.primary : COLORS.danger,
                opacity: isActive ? 1 : 0.4,
                textShadow: isActive ? `0 0 10px ${COLORS.primary}` : "none",
                transition: "all 0.3s ease",
              }}
            >
              →
            </div>
          );
        })}
      </div>

      {/* Results with 3D cards */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          display: "flex",
          gap: 40,
          transform: `translateY(${(1 - Math.max(0, resultsProgress)) * 30}px)`,
          opacity: Math.max(0, resultsProgress),
        }}
      >
        {[
          { value: "+23%", label: "Retention Boost", sublabel: "weak → strong memories", color: COLORS.success },
          { value: "-37%", label: "Fewer Retrievals", sublabel: "more efficient recall", color: COLORS.primary },
        ].map((stat, i) => (
          <div
            key={stat.label}
            style={{
              padding: "20px 30px",
              background: `linear-gradient(135deg, ${stat.color}15, ${stat.color}05)`,
              border: `1px solid ${stat.color}30`,
              borderRadius: 16,
              textAlign: "center",
              boxShadow: `0 10px 40px rgba(0,0,0,0.2), 0 0 20px ${stat.color}10`,
              transform: `perspective(500px) rotateY(${i === 0 ? 3 : -3}deg)`,
            }}
          >
            <div
              style={{
                fontSize: 42,
                fontWeight: 800,
                color: stat.color,
                fontFamily: FONTS.mono,
                textShadow: `0 0 20px ${stat.color}40`,
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginTop: 4 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
              {stat.sublabel}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
