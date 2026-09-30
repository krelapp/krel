import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
} from "remotion";
import { useBaseFrame } from "../time";
import { PixelBg } from "../PixelBg";
import { mono, pixel } from "../fonts";

const POP = Easing.bezier(0.2, 1.6, 0.3, 1);
const TAGS = [
  { word: "desks", at: 20 },
  { word: "radio", at: 28 },
  { word: "sofa", at: 36 },
  { word: "a cat", at: 44 },
];

export const TheRoom: React.FC = () => {
  const frame = useBaseFrame();

  return (
    <AbsoluteFill name="The room">
      <PixelBg />
      <AbsoluteFill
        name="Camera"
        style={{
          justifyContent: "center",
          alignItems: "center",
          scale: interpolate(frame, [0, 130], [1, 1.06], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <Interactive.Div
          name="Headline"
          style={{
            fontFamily: pixel,
            color: "#f3e6d0",
            fontSize: 52,
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
          A pixel room you walk through
        </Interactive.Div>
        <Interactive.Div
          name="Room"
          style={{
            width: 1100,
            height: 460,
            marginTop: 50,
            backgroundColor: "#eadbc2",
            boxShadow: "14px 14px 0 #c8452c",
            position: "relative",
            overflow: "hidden",
            translate: interpolate(frame, [4, 18], ["0px 500px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.2, 1.3, 0.3, 1),
            }),
            rotate: interpolate(frame, [4, 20], ["6deg", "0deg"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.2, 1.3, 0.3, 1),
            }),
          }}
        >
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 150, backgroundColor: "#c8452c" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 70, backgroundColor: "#b07b4f" }} />
          <Interactive.Div
            name="Window"
            style={{
              position: "absolute",
              left: 80,
              top: 50,
              width: 200,
              height: 120,
              backgroundColor: "#9fc5e8",
              border: "10px solid #5b4636",
              transformOrigin: "50% 100%",
              scale: interpolate(frame, [14, 22], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: POP,
                output: "perceptual-scale",
              }),
            }}
          />
          <Interactive.Div
            name="Lamp"
            style={{
              position: "absolute",
              left: 560,
              top: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transformOrigin: "50% 0%",
              translate: interpolate(frame, [16, 26], ["0px -140px", "0px 0px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: POP,
              }),
              rotate: `${Math.sin(frame / 9) * 5}deg`,
            }}
          >
            <div style={{ width: 6, height: 70, backgroundColor: "#1e1a17" }} />
            <div style={{ width: 80, height: 32, backgroundColor: "#e8b44a" }} />
            <div style={{ width: 24, height: 12, backgroundColor: "#fff6d8" }} />
          </Interactive.Div>
          <Interactive.Div
            name="Desk"
            style={{
              position: "absolute",
              left: 80,
              bottom: 70,
              width: 250,
              height: 130,
              transformOrigin: "50% 100%",
              scale: interpolate(frame, [20, 28], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: POP,
                output: "perceptual-scale",
              }),
            }}
          >
            <div style={{ position: "absolute", left: 60, top: 0, width: 110, height: 70, backgroundColor: "#2a2420", border: "6px solid #1e1a17" }} />
            <div style={{ position: "absolute", left: 72, top: 12, width: 86, height: 46, backgroundColor: frame % 20 < 10 ? "#9fe0a8" : "#7cc98a" }} />
            <div style={{ position: "absolute", left: 0, bottom: 0, width: 250, height: 60, backgroundColor: "#8e5d38" }} />
          </Interactive.Div>
          <Interactive.Div
            name="Radio"
            style={{
              position: "absolute",
              left: 400,
              bottom: 70,
              width: 120,
              height: 76,
              backgroundColor: "#5b4636",
              transformOrigin: "50% 100%",
              scale: interpolate(frame, [28, 36], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: POP,
                output: "perceptual-scale",
              }),
            }}
          >
            <div style={{ position: "absolute", left: 16, top: 16, width: 44, height: 44, backgroundColor: "#1e1a17" }} />
            <div style={{ position: "absolute", right: 16, top: 18, width: 30, height: 10, backgroundColor: "#e8b44a" }} />
            {[0, 1, 2].map((i) => {
              const t = ((frame + i * 12) % 36) / 36;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: 40 + i * 26,
                    top: -20 - t * 90,
                    width: 14,
                    height: 14,
                    backgroundColor: "#1e1a17",
                    opacity: frame < 36 ? 0 : 1 - t,
                  }}
                />
              );
            })}
          </Interactive.Div>
          <Interactive.Div
            name="Sofa"
            style={{
              position: "absolute",
              right: 130,
              bottom: 70,
              width: 300,
              height: 130,
              transformOrigin: "50% 100%",
              scale: interpolate(frame, [36, 44], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: POP,
                output: "perceptual-scale",
              }),
            }}
          >
            <div style={{ position: "absolute", left: 0, top: 0, width: 300, height: 70, backgroundColor: "#24494d" }} />
            <div style={{ position: "absolute", left: 0, bottom: 0, width: 300, height: 70, backgroundColor: "#2f5d62" }} />
          </Interactive.Div>
          <Interactive.Div
            name="Cat"
            style={{
              position: "absolute",
              right: 200,
              bottom: 140,
              width: 64,
              height: 40,
              backgroundColor: "#e8b44a",
              transformOrigin: "50% 100%",
              scale: interpolate(frame, [44, 52], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: POP,
                output: "perceptual-scale",
              }),
              translate: `0px ${Math.abs(Math.sin(frame / 7)) * -6}px`,
            }}
          >
            <div style={{ position: "absolute", left: 4, top: -14, width: 14, height: 14, backgroundColor: "#e8b44a" }} />
            <div style={{ position: "absolute", left: 30, top: -14, width: 14, height: 14, backgroundColor: "#e8b44a" }} />
            <div style={{ position: "absolute", left: 10, top: 12, width: 8, height: 8, backgroundColor: "#1e1a17" }} />
            <div style={{ position: "absolute", left: 30, top: 12, width: 8, height: 8, backgroundColor: "#1e1a17" }} />
          </Interactive.Div>
          <Interactive.Div
            name="Walker"
            style={{
              position: "absolute",
              bottom: 76,
              width: 44,
              height: 110,
              left: interpolate(frame, [30, 120], [-60, 680], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: `0px ${-Math.abs(Math.sin(frame / 3)) * 12}px`,
            }}
          >
            <div style={{ width: 44, height: 40, backgroundColor: "#f0c8a0" }} />
            <div style={{ width: 44, height: 70, backgroundColor: "#8e2f1e" }} />
          </Interactive.Div>
        </Interactive.Div>
        <Interactive.Div
          name="Tags"
          style={{ display: "flex", gap: 22, marginTop: 44 }}
        >
          {TAGS.map((t) => (
            <div
              key={t.word}
              style={{
                fontFamily: mono,
                fontWeight: 600,
                fontSize: 34,
                padding: "10px 22px",
                backgroundColor: "#e8b44a",
                color: "#1e1a17",
                boxShadow: "5px 5px 0 #7d2a1a",
                scale: String(
                  interpolate(frame, [t.at, t.at + 8], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: POP,
                  }),
                ),
              }}
            >
              {t.word}
            </div>
          ))}
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
