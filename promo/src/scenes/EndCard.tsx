import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
} from "remotion";
import { useBaseFrame } from "../time";
import { KrelLogo } from "../KrelLogo";
import { PixelBg } from "../PixelBg";
import { mono, pixel } from "../fonts";

export const EndCard: React.FC = () => {
  const frame = useBaseFrame();

  return (
    <AbsoluteFill name="End card">
      <PixelBg />
      <Interactive.Div
        name="Top bar"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 36,
          backgroundColor: "#c8452c",
          borderBottom: "10px solid #7d2a1a",
          translate: interpolate(frame, [0, 10], ["0px -60px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          }),
        }}
      />
      <Interactive.Div
        name="Bottom bar"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 36,
          backgroundColor: "#c8452c",
          borderTop: "10px solid #7d2a1a",
          translate: interpolate(frame, [0, 10], ["0px 60px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          }),
        }}
      />
      <AbsoluteFill
        name="Center"
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 90,
        }}
      >
        <Interactive.Div
          name="Logo"
          style={{
            scale: interpolate(frame, [2, 18], [0.4, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.2, 1.5, 0.3, 1),
              output: "perceptual-scale",
            }),
            rotate: interpolate(frame, [2, 20], ["200deg", "0deg"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.2, 1.3, 0.3, 1),
            }),
            translate: interpolate(frame, [40, 80, 120, 153], ["0px 0px", "0px -14px", "0px 6px", "0px -8px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <KrelLogo size={500} delay={2} />
        </Interactive.Div>
        <Interactive.Div
          name="Copy"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 34,
            opacity: interpolate(frame, [30, 36], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            translate: interpolate(frame, [30, 44], ["120px 0px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.2, 1.4, 0.3, 1),
            }),
          }}
        >
          <Interactive.Div
            name="Tagline"
            style={{
              fontFamily: pixel,
              color: "#f3e6d0",
              fontSize: 64,
              lineHeight: 1.4,
              textShadow: "6px 6px 0 #c8452c",
            }}
          >
            Come in.
            <br />
            Stay.
          </Interactive.Div>
          <Interactive.Div
            name="Sub"
            style={{
              fontFamily: mono,
              color: "#e8b44a",
              fontSize: 34,
              fontWeight: 600,
            }}
          >
            A pixel room. Up to 20 people.
          </Interactive.Div>
          <Interactive.Div
            name="CTA"
            style={{
              alignSelf: "flex-start",
              fontFamily: pixel,
              fontSize: 30,
              padding: "20px 30px",
              backgroundColor: "#f3e6d0",
              color: "#1e1a17",
              boxShadow: "0 8px 0 #7d2a1a",
              opacity: frame < 56 ? 0 : frame % 24 < 16 ? 1 : 0.35,
              scale: interpolate(frame, [56, 66], [0.5, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.2, 1.6, 0.3, 1),
                output: "perceptual-scale",
              }),
            }}
          >
            PRESS ENTER
          </Interactive.Div>
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
