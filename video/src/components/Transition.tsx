import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../config";

// Fade transition wrapper
export const FadeTransition: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
}> = ({ children, durationInFrames, fadeInFrames = 20, fadeOutFrames = 15 }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [0, fadeInFrames, durationInFrames - fadeOutFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};

// Slide + Fade transition
export const SlideTransition: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
  direction?: "left" | "right" | "up" | "down";
  fadeInFrames?: number;
  fadeOutFrames?: number;
}> = ({ children, durationInFrames, direction = "up", fadeInFrames = 25, fadeOutFrames = 20 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animation - smoother with lower stiffness
  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 25, stiffness: 50, mass: 1.2 },
  });

  // Exit animation - gentle exit
  const exitProgress = spring({
    frame: frame - (durationInFrames - fadeOutFrames),
    fps,
    config: { damping: 30, stiffness: 60, mass: 1 },
  });

  const isExiting = frame > durationInFrames - fadeOutFrames;

  // Calculate transform based on direction
  const getTransform = (progress: number, entering: boolean) => {
    const distance = entering ? 60 : 40;
    const offset = (1 - progress) * distance;

    switch (direction) {
      case "left":
        return `translateX(${entering ? offset : -offset}px)`;
      case "right":
        return `translateX(${entering ? -offset : offset}px)`;
      case "up":
        return `translateY(${entering ? offset : -offset}px)`;
      case "down":
        return `translateY(${entering ? -offset : offset}px)`;
    }
  };

  const opacity = interpolate(
    frame,
    [0, fadeInFrames, durationInFrames - fadeOutFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const transform = isExiting
    ? getTransform(1 - Math.max(0, exitProgress), false)
    : getTransform(enterProgress, true);

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// Scale + Fade transition (zoom effect)
export const ScaleTransition: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
}> = ({ children, durationInFrames, fadeInFrames = 25, fadeOutFrames = 20 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterScale = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 80 },
    from: 0.9,
    to: 1,
  });

  const exitScale = interpolate(
    frame,
    [durationInFrames - fadeOutFrames, durationInFrames],
    [1, 1.05],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = interpolate(
    frame,
    [0, fadeInFrames, durationInFrames - fadeOutFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const isExiting = frame > durationInFrames - fadeOutFrames;
  const scale = isExiting ? exitScale : enterScale;

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// Wipe transition with color
export const WipeTransition: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
  color?: string;
  direction?: "left" | "right";
}> = ({ children, durationInFrames, color = COLORS.primary, direction = "right" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Wipe in
  const wipeInProgress = spring({
    frame,
    fps,
    config: { damping: 25, stiffness: 100 },
  });

  // Wipe out
  const wipeOutProgress = spring({
    frame: frame - (durationInFrames - 25),
    fps,
    config: { damping: 25, stiffness: 100 },
  });

  const showContent = frame > 15 && frame < durationInFrames - 10;

  return (
    <AbsoluteFill>
      {/* Content */}
      <AbsoluteFill style={{ opacity: showContent ? 1 : 0 }}>
        {children}
      </AbsoluteFill>

      {/* Wipe overlay - entrance */}
      {frame < 30 && (
        <AbsoluteFill
          style={{
            background: color,
            transform: direction === "right"
              ? `translateX(${(wipeInProgress - 1) * 100}%)`
              : `translateX(${(1 - wipeInProgress) * 100}%)`,
          }}
        />
      )}

      {/* Wipe overlay - exit */}
      {frame > durationInFrames - 30 && (
        <AbsoluteFill
          style={{
            background: color,
            transform: direction === "right"
              ? `translateX(${-wipeOutProgress * 100}%)`
              : `translateX(${wipeOutProgress * 100}%)`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

// Blur transition
export const BlurTransition: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
}> = ({ children, durationInFrames, fadeInFrames = 20, fadeOutFrames = 15 }) => {
  const frame = useCurrentFrame();

  const blurIn = interpolate(frame, [0, fadeInFrames], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const blurOut = interpolate(
    frame,
    [durationInFrames - fadeOutFrames, durationInFrames],
    [0, 8],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const blur = frame < fadeInFrames ? blurIn : blurOut;

  const opacity = interpolate(
    frame,
    [0, fadeInFrames, durationInFrames - fadeOutFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        opacity,
        filter: `blur(${blur}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
