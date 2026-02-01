import { Composition } from "remotion";
import { MemoryPalaceExplainer } from "./MemoryPalaceExplainer";
import { TOTAL_FRAMES, FPS } from "./config";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MemoryPalaceExplainer"
      component={MemoryPalaceExplainer}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
