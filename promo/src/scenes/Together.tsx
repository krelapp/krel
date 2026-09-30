import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  spring,
} from "remotion";
import { BASE_FPS, useBaseFrame } from "../time";
import { PixelBg } from "../PixelBg";
import { mono, pixel } from "../fonts";

const PEOPLE = [
  { name: "you", color: "#c8452c", h: 150 },
  { name: "sam", color: "#2f5d62", h: 170 },
  { name: "dee", color: "#e8b44a", h: 140 },
  { name: "ko", color: "#8e2f1e", h: 160 },
  { name: "mei", color: "#6fae5b", h: 146 },
];

export const Together: React.FC = () => {
  const frame = useBaseFrame();
  const fps = BASE_FPS;
  const here = Math.round(
    interpolate(frame, [10, 40], [0, PEOPLE.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  return (
    <AbsoluteFill name="Together">
      <PixelBg />
      <AbsoluteFill
        name="Center"
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <Interactive.Div
          name="Headline"
          style={{
            fontFamily: pixel,
            color: "#f3e6d0",
            fontSize: 64,
            textShadow: "6px 6px 0 #c8452c",
            opacity: interpolate(frame, [0, 4], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            scale: interpolate(frame, [0, 9], [1.8, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.3, 1.3, 0.4, 1),
              output: "perceptual-scale",
            }),
          }}
        >
          One room. Everyone.
        </Interactive.Div>
        <Interactive.Div
          name="People"
          style={{
            display: "flex",
            gap: 56,
            marginTop: 110,
            alignItems: "flex-end",
            height: 320,
          }}
        >
          {PEOPLE.map((p, i) => {
            const land = spring({
              frame: frame - 8 - i * 5,
              fps,
              config: { damping: 8, stiffness: 180 },
            });
            const tag = spring({
              frame: frame - 22 - i * 5,
              fps,
              config: { damping: 9, stiffness: 220 },
            });
            return (
              <div
                key={p.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  translate: `0px ${(1 - land) * -900 + Math.sin(frame / 6 + i) * 6}px`,
                  rotate: `${(1 - land) * (i % 2 ? 30 : -30)}deg`,
                }}
              >
                <div
                  style={{
                    fontFamily: mono,
                    fontWeight: 600,
                    fontSize: 28,
                    padding: "6px 14px",
                    marginBottom: 18,
                    backgroundColor: "#f3e6d0",
                    color: "#1e1a17",
                    scale: String(tag),
                  }}
                >
                  {p.name}
                </div>
                <div style={{ width: 70, height: 70, backgroundColor: "#f0c8a0" }} />
                <div
                  style={{
                    width: 110,
                    height: p.h,
                    backgroundColor: p.color,
                    boxShadow: "8px 8px 0 #000",
                  }}
                />
              </div>
            );
          })}
        </Interactive.Div>
        <Interactive.Div
          name="Counter"
          style={{
            marginTop: 56,
            fontFamily: pixel,
            fontSize: 34,
            color: "#1e1a17",
            backgroundColor: "#e8b44a",
            padding: "16px 28px",
            boxShadow: "6px 6px 0 #7d2a1a",
            scale: interpolate(frame, [30, 40], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.2, 1.6, 0.3, 1),
              output: "perceptual-scale",
            }),
          }}
        >
          <span style={{ color: frame % 20 < 12 ? "#c8452c" : "#1e1a17" }}>■</span>{" "}
          {here} / 20 here
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
