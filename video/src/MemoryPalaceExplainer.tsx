import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  interpolate,
  spring,
  Audio,
  staticFile,
} from "remotion";
import { SCENES, getSceneStart, COLORS, FONTS } from "./config";
import { IntroScene } from "./scenes/IntroScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { SmashinScene } from "./scenes/SmashinScene";
import { HierarchyScene } from "./scenes/HierarchyScene";
import { VerificationScene } from "./scenes/VerificationScene";
import { RedQueenScene } from "./scenes/RedQueenScene";
import { BenchmarksScene } from "./scenes/BenchmarksScene";
import { OutroScene } from "./scenes/OutroScene";

export const MemoryPalaceExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Progress bar
  const progress = (frame / durationInFrames) * 100;

  return (
    <AbsoluteFill
      style={{
        background: COLORS.backgroundGradient,
        fontFamily: FONTS.body,
      }}
    >
      {/* Scene 1: Intro */}
      <Sequence from={getSceneStart(0)} durationInFrames={SCENES[0].durationInFrames}>
        <IntroScene />
        <Audio src={staticFile(`audio/${SCENES[0].audioFile}`)} volume={0.9} />
      </Sequence>

      {/* Scene 2: Problem */}
      <Sequence from={getSceneStart(1)} durationInFrames={SCENES[1].durationInFrames}>
        <ProblemScene />
        <Audio src={staticFile(`audio/${SCENES[1].audioFile}`)} volume={0.9} />
      </Sequence>

      {/* Scene 3: SMASHIN SCOPE */}
      <Sequence from={getSceneStart(2)} durationInFrames={SCENES[2].durationInFrames}>
        <SmashinScene />
        <Audio src={staticFile(`audio/${SCENES[2].audioFile}`)} volume={0.9} />
      </Sequence>

      {/* Scene 4: Hierarchical Index */}
      <Sequence from={getSceneStart(3)} durationInFrames={SCENES[3].durationInFrames}>
        <HierarchyScene />
        <Audio src={staticFile(`audio/${SCENES[3].audioFile}`)} volume={0.9} />
      </Sequence>

      {/* Scene 5: Verification Tokens */}
      <Sequence from={getSceneStart(4)} durationInFrames={SCENES[4].durationInFrames}>
        <VerificationScene />
        <Audio src={staticFile(`audio/${SCENES[4].audioFile}`)} volume={0.9} />
      </Sequence>

      {/* Scene 6: Red Queen Protocol */}
      <Sequence from={getSceneStart(5)} durationInFrames={SCENES[5].durationInFrames}>
        <RedQueenScene />
        <Audio src={staticFile(`audio/${SCENES[5].audioFile}`)} volume={0.9} />
      </Sequence>

      {/* Scene 7: Benchmarks */}
      <Sequence from={getSceneStart(6)} durationInFrames={SCENES[6].durationInFrames}>
        <BenchmarksScene />
        <Audio src={staticFile(`audio/${SCENES[6].audioFile}`)} volume={0.9} />
      </Sequence>

      {/* Scene 8: Outro */}
      <Sequence from={getSceneStart(7)} durationInFrames={SCENES[7].durationInFrames}>
        <OutroScene />
        <Audio src={staticFile(`audio/${SCENES[7].audioFile}`)} volume={0.9} />
      </Sequence>

      {/* Background music - low volume, fades in/out */}
      <Audio
        src={staticFile("audio/background-music.mp3")}
        volume={(f) =>
          interpolate(
            f,
            [0, 60, durationInFrames - 90, durationInFrames],
            [0, 0.12, 0.12, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )
        }
        loop
      />

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: "rgba(255,255,255,0.1)",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            backgroundColor: COLORS.primary,
            transition: "width 0.1s ease-out",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
