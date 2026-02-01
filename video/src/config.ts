// Memory Palace Explainer Video Configuration

export const FPS = 30;

// Scene definitions with timing
export const SCENES = [
  {
    id: "intro",
    title: "Memory Palace",
    subtitle: "Ancient Wisdom Meets Modern AI",
    durationInFrames: 150, // 5 seconds
  },
  {
    id: "problem",
    title: "The Problem",
    subtitle: "LLMs Forget & Hallucinate",
    durationInFrames: 120, // 4 seconds
  },
  {
    id: "smashin",
    title: "SMASHIN SCOPE",
    subtitle: "12-Factor Memorable Encoding",
    durationInFrames: 180, // 6 seconds
  },
  {
    id: "hierarchy",
    title: "Hierarchical Index",
    subtitle: "97% Context Reduction",
    durationInFrames: 150, // 5 seconds
  },
  {
    id: "verification",
    title: "Verification Tokens",
    subtitle: "F1=0.92 Hallucination Detection",
    durationInFrames: 150, // 5 seconds
  },
  {
    id: "redqueen",
    title: "Red Queen Protocol",
    subtitle: "Adversarial Pre-Learning",
    durationInFrames: 150, // 5 seconds
  },
  {
    id: "benchmarks",
    title: "Benchmarks",
    subtitle: "Competitive with Billion-Parameter Models",
    durationInFrames: 180, // 6 seconds
  },
  {
    id: "outro",
    title: "Get Started",
    subtitle: "npx skills add memory-palace",
    durationInFrames: 120, // 4 seconds
  },
];

// Calculate scene start frames
export const getSceneStart = (index: number): number => {
  return SCENES.slice(0, index).reduce((acc, scene) => acc + scene.durationInFrames, 0);
};

export const TOTAL_FRAMES = SCENES.reduce((acc, scene) => acc + scene.durationInFrames, 0);

// Colors - Dark theme with accent colors
export const COLORS = {
  background: "#0a0a0f",
  backgroundGradient: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)",
  primary: "#00d4aa",      // Teal/green - Memory Palace brand
  secondary: "#6366f1",    // Indigo
  accent: "#f59e0b",       // Amber for highlights
  danger: "#ef4444",       // Red for problems/errors
  success: "#22c55e",      // Green for success
  text: "#ffffff",
  textMuted: "#94a3b8",
  card: "rgba(255, 255, 255, 0.05)",
  cardBorder: "rgba(255, 255, 255, 0.1)",
};

// Typography
export const FONTS = {
  heading: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};
