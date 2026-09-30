import { useCurrentFrame, useVideoConfig } from "remotion";

export const BASE_FPS = 30;
export const VIDEO_FPS = 60;

export const f = (baseFrames: number) => Math.round((baseFrames * VIDEO_FPS) / BASE_FPS);

// Animations are authored in 30fps frames; this returns the (fractional) 30fps frame
// for any render fps so motion stays the same speed but gets smoother.
export const useBaseFrame = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (frame * BASE_FPS) / fps;
};
