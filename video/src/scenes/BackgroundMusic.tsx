import { Audio, staticFile, useCurrentFrame, interpolate } from "remotion";

// Background music component with fade in/out
export const BackgroundMusic: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();

  // Fade in over first 30 frames, fade out over last 60 frames
  const volume = interpolate(
    frame,
    [0, 30, durationInFrames - 60, durationInFrames],
    [0, 0.15, 0.15, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  return (
    <Audio
      src={staticFile("audio/background-music.mp3")}
      volume={volume}
      loop
    />
  );
};
