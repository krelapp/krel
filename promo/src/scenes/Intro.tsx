import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  random,
} from "remotion";
import { useBaseFrame } from "../time";
import { KrelLogo } from "../KrelLogo";
import { PixelBg } from "../PixelBg";
import { pixel } from "../fonts";

const BURST = ["#e8b44a", "#c8452c", "#f3e6d0"];
const TAGLINE = "Come in. Stay.";

export const Intro: React.FC = () => {
  const frame = useBaseFrame();
  const burst = interpolate(frame, [36, 66], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const typed = Math.floor(
    interpolate(frame, [46, 70], [0, TAGLINE.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  return (
    <AbsoluteFill name="Intro">
      <PixelBg />
      <AbsoluteFill name="Burst">
        {Array.from({ length: 28 }).map((_, i) => {
          const ang = (i / 28) * Math.PI * 2 + random(`a${i}`) * 0.3;
          const dist = 320 + random(`d${i}`) * 420;
          const size = 14 + Math.floor(random(`s${i}`) * 3) * 8;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 960 - size / 2,
                top: 470 - size / 2,
                width: size,
                height: size,
                backgroundColor: BURST[i % 3],
                translate: `${Math.cos(ang) * dist * burst}px ${Math.sin(ang) * dist * burst}px`,
                opacity: interpolate(frame, [36, 40, 58, 70], [0, 1, 1, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            />
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill
        name="Center"
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <Interactive.Div
          name="Logo punch"
          style={{
            marginTop: -40,
            scale: interpolate(frame, [34, 38, 48], [1, 1.1, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.2, 1.4, 0.3, 1),
              output: "perceptual-scale",
            }),
            translate: interpolate(frame, [48, 76, 105], ["0px 0px", "0px -12px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <Interactive.Div
            name="Logo"
            style={{
              scale: interpolate(frame, [0, 14], [0.55, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.2, 1.5, 0.3, 1),
                output: "perceptual-scale",
              }),
              rotate: interpolate(frame, [0, 16], ["-20deg", "0deg"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.2, 1.4, 0.3, 1),
              }),
            }}
          >
            <KrelLogo size={600} />
          </Interactive.Div>
        </Interactive.Div>
        <Interactive.Div
          name="Tagline"
          style={{
            fontFamily: pixel,
            fontSize: 40,
            letterSpacing: 4,
            marginTop: 40,
            color: "#e8b44a",
          }}
        >
          <span>{TAGLINE.slice(0, typed)}</span>
          <span style={{ color: "transparent" }}>{TAGLINE.slice(typed)}</span>
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
