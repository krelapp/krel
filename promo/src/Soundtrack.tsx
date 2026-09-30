import { Audio } from "@remotion/media";
import { Sequence, staticFile } from "remotion";
import { f } from "./time";

type Cue = { at: number; sfx: string; volume?: number };

const INTRO = 0;
const ROOM = 90;
const TOGETHER = 210;
const CHITCHAT = 330;
const END = 450;

const TAGLINE = "Come in. Stay.";
const CHAT = [
  { at: 16, side: "lo" },
  { at: 38, side: "hi" },
  { at: 60, side: "lo" },
  { at: 80, side: "hi" },
];

const CUES: Cue[] = [
  { at: INTRO, sfx: "riser", volume: 0.35 },
  { at: INTRO + 4, sfx: "pop", volume: 0.45 },
  ...[16, 20, 24, 28].map((at) => ({ at: INTRO + at, sfx: "thud", volume: 0.6 })),
  { at: INTRO + 30, sfx: "zip", volume: 0.3 },
  { at: INTRO + 36, sfx: "boom", volume: 0.5 },
  { at: INTRO + 36, sfx: "sparkle", volume: 0.45 },
  ...[...TAGLINE].flatMap((ch, i) =>
    ch === " " ? [] : [{ at: INTRO + 46 + Math.round((i * 24) / TAGLINE.length), sfx: "tick", volume: 0.25 }],
  ),

  ...[ROOM, TOGETHER, CHITCHAT, END].map((at) => ({ at: at - 2, sfx: "whoosh", volume: 0.32 })),

  { at: ROOM, sfx: "slam", volume: 0.38 },
  ...[14, 16, 20, 28, 36].map((at) => ({ at: ROOM + at, sfx: "pop", volume: 0.4 })),
  { at: ROOM + 46, sfx: "mew", volume: 0.45 },
  ...Array.from({ length: 9 }, (_, k) => ({ at: ROOM + 38 + Math.round(k * 9.42), sfx: "step", volume: 0.22 })),

  { at: TOGETHER, sfx: "slam", volume: 0.38 },
  ...[0, 1, 2, 3, 4].map((i) => ({ at: TOGETHER + 13 + i * 5, sfx: `bounce-${i}`, volume: 0.45 })),
  { at: TOGETHER + 32, sfx: "coin", volume: 0.4 },

  { at: CHITCHAT, sfx: "slam", volume: 0.38 },
  ...CHAT.flatMap((m) => [
    { at: CHITCHAT + m.at - 9, sfx: "typing", volume: 0.3 },
    { at: CHITCHAT + m.at, sfx: `blip-${m.side}`, volume: 0.45 },
  ]),

  { at: END + 2, sfx: "spin", volume: 0.35 },
  ...[16, 20, 24, 28].map((at) => ({ at: END + 2 + at, sfx: "thud", volume: 0.4 })),
  { at: END + 30, sfx: "whoosh", volume: 0.3 },
  { at: END + 32, sfx: "zip", volume: 0.25 },
  { at: END + 56, sfx: "powerup", volume: 0.4 },
];

const src = (name: string) => staticFile(`audio/${name}.wav`);

export const Soundtrack: React.FC = () => (
  <>
    <Audio src={src("music")} volume={0.5} name="Music" />
    {CUES.map((c, i) => (
      <Sequence key={i} from={f(c.at)} name={`SFX ${c.sfx}`} layout="none">
        <Audio src={src(c.sfx)} volume={c.volume ?? 0.5} />
      </Sequence>
    ))}
  </>
);
