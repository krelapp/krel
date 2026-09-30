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

const MESSAGES = [
  { side: "left", who: "sam", text: "hey. you in?", at: 16, color: "#f3e6d0" },
  { side: "right", who: "you", text: "yeah. just sitting.", at: 38, color: "#e8b44a" },
  { side: "left", who: "sam", text: "same. radio's good.", at: 60, color: "#f3e6d0" },
  { side: "right", who: "you", text: "stay a bit :)", at: 80, color: "#e8b44a" },
] as const;

export const Chitchat: React.FC = () => {
  const frame = useBaseFrame();
  const fps = BASE_FPS;

  return (
    <AbsoluteFill name="Chitchat">
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
            fontSize: 60,
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
          You can talk here
        </Interactive.Div>
        <Interactive.Div
          name="Chat panel"
          style={{
            width: 1080,
            height: 560,
            marginTop: 50,
            padding: "36px 44px",
            boxSizing: "border-box",
            backgroundColor: "#2a2420",
            border: "6px solid #f3e6d0",
            boxShadow: "14px 14px 0 #c8452c",
            display: "flex",
            flexDirection: "column",
            gap: 26,
            translate: interpolate(frame, [4, 16], ["0px 400px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.2, 1.3, 0.3, 1),
            }),
          }}
        >
          {MESSAGES.map((m, i) => {
            const pop = spring({
              frame: frame - m.at,
              fps,
              config: { damping: 9, stiffness: 240 },
            });
            const typing = frame >= m.at - 10 && frame < m.at;
            const left = m.side === "left";
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: left ? "row" : "row-reverse",
                  alignItems: "flex-end",
                  gap: 18,
                  opacity: frame >= m.at - 10 ? 1 : 0,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    backgroundColor: left ? "#2f5d62" : "#c8452c",
                    border: "4px solid #1e1a17",
                  }}
                />
                {typing ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "24px 26px",
                      backgroundColor: "#4a3f37",
                    }}
                  >
                    {[0, 1, 2].map((d) => (
                      <div
                        key={d}
                        style={{
                          width: 14,
                          height: 14,
                          backgroundColor: "#f3e6d0",
                          opacity: Math.floor(frame / 3 + d) % 3 === 0 ? 1 : 0.3,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      fontFamily: mono,
                      fontWeight: 600,
                      fontSize: 38,
                      padding: "16px 26px",
                      backgroundColor: m.color,
                      color: "#1e1a17",
                      boxShadow: "6px 6px 0 #1e1a17",
                      transformOrigin: left ? "0% 100%" : "100% 100%",
                      scale: String(pop),
                      rotate: `${(1 - pop) * (left ? -10 : 10)}deg`,
                    }}
                  >
                    {m.text}
                  </div>
                )}
              </div>
            );
          })}
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
