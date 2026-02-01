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
import { SlideTransition, ScaleTransition, FadeTransition, BlurTransition } from "./components/Transition";

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
      {/* Scene 1: Intro - Scale in for dramatic effect */}
      <Sequence from={getSceneStart(0)} durationInFrames={SCENES[0].durationInFrames}>
        <ScaleTransition durationInFrames={SCENES[0].durationInFrames} fadeInFrames={30} fadeOutFrames={20}>
          <IntroScene />
        </ScaleTransition>
        <Audio src={staticFile(`audio/${SCENES[0].audioFile}`)} volume={0.9} />
      </Sequence>

      {/* Scene 2: Problem - Slide up to introduce the problem */}
      <Sequence from={getSceneStart(1)} durationInFrames={SCENES[1].durationInFrames}>
        <SlideTransition durationInFrames={SCENES[1].durationInFrames} direction="up" fadeInFrames={25} fadeOutFrames={20}>
          <ProblemScene />
        </SlideTransition>
        <Audio src={staticFile(`audio/${SCENES[1].audioFile}`)} volume={0.9} />
      </Sequence>

      {/* Scene 3: SMASHIN SCOPE - Slide from right */}
      <Sequence from={getSceneStart(2)} durationInFrames={SCENES[2].durationInFrames}>
        <SlideTransition durationInFrames={SCENES[2].durationInFrames} direction="right" fadeInFrames={25} fadeOutFrames={20}>
          <SmashinScene />
        </SlideTransition>
        <Audio src={staticFile(`audio/${SCENES[2].audioFile}`)} volume={0.9} />
      </Sequence>

      {/* Scene 4: Hierarchical Index - Scale for depth */}
      <Sequence from={getSceneStart(3)} durationInFrames={SCENES[3].durationInFrames}>
        <ScaleTransition durationInFrames={SCENES[3].durationInFrames} fadeInFrames={25} fadeOutFrames={20}>
          <HierarchyScene />
        </ScaleTransition>
        <Audio src={staticFile(`audio/${SCENES[3].audioFile}`)} volume={0.9} />
      </Sequence>

      {/* Scene 5: Verification Tokens - Slide from left */}
      <Sequence from={getSceneStart(4)} durationInFrames={SCENES[4].durationInFrames}>
        <SlideTransition durationInFrames={SCENES[4].durationInFrames} direction="left" fadeInFrames={25} fadeOutFrames={20}>
          <VerificationScene />
        </SlideTransition>
        <Audio src={staticFile(`audio/${SCENES[4].audioFile}`)} volume={0.9} />
      </Sequence>

      {/* Scene 6: Red Queen Protocol - Fade transition */}
      <Sequence from={getSceneStart(5)} durationInFrames={SCENES[5].durationInFrames}>
        <FadeTransition durationInFrames={SCENES[5].durationInFrames} fadeInFrames={25} fadeOutFrames={20}>
          <RedQueenScene />
        </FadeTransition>
        <Audio src={staticFile(`audio/${SCENES[5].audioFile}`)} volume={0.9} />
      </Sequence>

      {/* Scene 7: Benchmarks - Slide up for data */}
      <Sequence from={getSceneStart(6)} durationInFrames={SCENES[6].durationInFrames}>
        <SlideTransition durationInFrames={SCENES[6].durationInFrames} direction="up" fadeInFrames={25} fadeOutFrames={20}>
          <BenchmarksScene />
        </SlideTransition>
        <Audio src={staticFile(`audio/${SCENES[6].audioFile}`)} volume={0.9} />
      </Sequence>

      {/* Scene 8: Outro - Scale out for finale */}
      <Sequence from={getSceneStart(7)} durationInFrames={SCENES[7].durationInFrames}>
        <FadeTransition durationInFrames={SCENES[7].durationInFrames} fadeInFrames={30} fadeOutFrames={25}>
          <OutroScene />
        </FadeTransition>
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
