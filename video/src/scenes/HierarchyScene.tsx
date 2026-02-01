import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONTS } from "../config";

export const HierarchyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Animation stages
  const flatScale = spring({ frame: frame - 20, fps, config: { damping: 12 } });
  const hierarchyScale = spring({ frame: frame - 60, fps, config: { damping: 12 } });
  const reductionOpacity = interpolate(frame, [100, 120], [0, 1], { extrapolateRight: "clamp" });

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
        Hierarchical Memory Index
      </h2>

      {/* Comparison */}
      <div style={{ display: "flex", gap: 100, alignItems: "center" }}>
        {/* Flat RAG */}
        <div
          style={{
            textAlign: "center",
            transform: `scale(${Math.max(0, flatScale)})`,
          }}
        >
          <div
            style={{
              width: 300,
              height: 300,
              backgroundColor: `${COLORS.danger}10`,
              border: `2px solid ${COLORS.danger}`,
              borderRadius: 20,
              display: "flex",
              flexWrap: "wrap",
              padding: 20,
              gap: 8,
              alignContent: "flex-start",
            }}
          >
            {/* Many small documents */}
            {[...Array(36)].map((_, i) => (
              <div
                key={i}
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: `${COLORS.danger}40`,
                  borderRadius: 6,
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: 24, color: COLORS.danger, marginTop: 20, fontWeight: 600 }}>
            Flat RAG
          </p>
          <p style={{ fontSize: 32, color: COLORS.danger, fontWeight: 700 }}>
            500 KB
          </p>
          <p style={{ fontSize: 16, color: COLORS.textMuted }}>per query</p>
        </div>

        {/* Arrow */}
        <div
          style={{
            fontSize: 48,
            color: COLORS.primary,
            opacity: interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          →
        </div>

        {/* Hierarchical */}
        <div
          style={{
            textAlign: "center",
            transform: `scale(${Math.max(0, hierarchyScale)})`,
          }}
        >
          <div
            style={{
              width: 300,
              height: 300,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            {/* Root */}
            <div
              style={{
                width: 80,
                height: 40,
                backgroundColor: COLORS.primary,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#000",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              ROOT
            </div>
            {/* Lines */}
            <div style={{ display: "flex", gap: 60 }}>
              <div style={{ width: 2, height: 30, backgroundColor: COLORS.primary }} />
              <div style={{ width: 2, height: 30, backgroundColor: COLORS.primary }} />
              <div style={{ width: 2, height: 30, backgroundColor: COLORS.primary }} />
            </div>
            {/* Domains */}
            <div style={{ display: "flex", gap: 20 }}>
              {["Domain A", "Domain B", "Domain C"].map((name, i) => (
                <div
                  key={i}
                  style={{
                    width: 70,
                    height: 35,
                    backgroundColor: `${COLORS.secondary}80`,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: COLORS.text,
                    fontWeight: 600,
                    fontSize: 10,
                  }}
                >
                  {name}
                </div>
              ))}
            </div>
            {/* Memory node */}
            <div style={{ display: "flex", gap: 60 }}>
              <div style={{ width: 2, height: 30, backgroundColor: COLORS.secondary }} />
            </div>
            <div
              style={{
                width: 60,
                height: 30,
                backgroundColor: COLORS.success,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#000",
                fontWeight: 700,
                fontSize: 10,
              }}
            >
              Memory
            </div>
          </div>
          <p style={{ fontSize: 24, color: COLORS.success, marginTop: 20, fontWeight: 600 }}>
            Memory Palace
          </p>
          <p style={{ fontSize: 32, color: COLORS.success, fontWeight: 700 }}>
            2.5 KB
          </p>
          <p style={{ fontSize: 16, color: COLORS.textMuted }}>per query</p>
        </div>
      </div>

      {/* Reduction badge */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          padding: "16px 40px",
          backgroundColor: `${COLORS.primary}20`,
          border: `2px solid ${COLORS.primary}`,
          borderRadius: 100,
          opacity: reductionOpacity,
        }}
      >
        <span style={{ fontSize: 32, fontWeight: 700, color: COLORS.primary }}>
          97% Context Reduction
        </span>
      </div>
    </AbsoluteFill>
  );
};
