import { AbsoluteFill } from "remotion";
import { useBaseFrame } from "./time";

export const PixelBg: React.FC<{ color?: string; line?: string }> = ({
  color = "#1e1a17",
  line = "rgba(243,230,208,0.05)",
}) => {
  const frame = useBaseFrame();

  return (
    <AbsoluteFill
      name="Pixel grid"
      style={{
        backgroundColor: color,
        backgroundImage: `linear-gradient(${line} 3px, transparent 3px), linear-gradient(90deg, ${line} 3px, transparent 3px)`,
        backgroundSize: "60px 60px",
        backgroundPosition: `${frame * 1.5}px ${frame * 0.75}px`,
      }}
    />
  );
};
