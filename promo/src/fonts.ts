import { loadFont as loadPress } from "@remotion/google-fonts/PressStart2P";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";

export const { fontFamily: pixel } = loadPress("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

export const { fontFamily: mono } = loadMono("normal", {
  weights: ["400", "600"],
  subsets: ["latin"],
});
