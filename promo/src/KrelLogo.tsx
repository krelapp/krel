import { Easing, interpolate, spring } from "remotion";
import { BASE_FPS, useBaseFrame } from "./time";

const GLYPHS: Record<string, string[]> = {
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
};

const INK = "#1e1a17";
const TOMATO = "#c8452c";
const TOMATO_DARK = "#7d2a1a";
const CREAM = "#f3e6d0";
const MUSTARD = "#e8b44a";

const GRID = 60;
const C = GRID / 2;
const WORD_X = 8;
const WORD_Y = 23;

const RING: { x: number; y: number; color: string; a: number }[] = [];
const DISK: { y: number; x0: number; x1: number }[] = [];
for (let y = 0; y < GRID; y++) {
  let x0 = -1;
  let x1 = -1;
  for (let x = 0; x < GRID; x++) {
    const dx = x + 0.5 - C;
    const dy = y + 0.5 - C;
    const d = Math.hypot(dx, dy);
    if (d < 26) {
      if (x0 < 0) x0 = x;
      x1 = x + 1;
    } else if (d < 29.7) {
      RING.push({
        x,
        y,
        color: d >= 28 ? TOMATO_DARK : TOMATO,
        a: (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1,
      });
    }
  }
  if (x0 >= 0) DISK.push({ y, x0, x1 });
}

const LETTERS = "KREL".split("").map((ch, i) => {
  const px: { x: number; y: number }[] = [];
  GLYPHS[ch].forEach((row, ry) => {
    [...row].forEach((bit, rx) => {
      if (bit === "#") px.push({ x: rx * 2, y: ry * 2 });
    });
  });
  return { ch, x: WORD_X + i * 12, px };
});

export const KrelLogo: React.FC<{ size: number; delay?: number }> = ({
  size,
  delay = 0,
}) => {
  const frame = useBaseFrame() - delay;
  const fps = BASE_FPS;

  const sweep = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const disk = spring({ frame: frame - 4, fps, config: { damping: 10, stiffness: 170 } });
  const bar = interpolate(frame, [30, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${GRID} ${GRID}`}
      shapeRendering="crispEdges"
      style={{ display: "block", overflow: "visible" }}
    >
      {RING.map((c, i) =>
        c.a <= sweep ? (
          <rect key={i} x={c.x} y={c.y} width={1.02} height={1.02} fill={c.color} />
        ) : null,
      )}
      <g transform={`translate(${C} ${C}) scale(${disk}) translate(${-C} ${-C})`}>
        {DISK.map((r) => (
          <rect key={r.y} x={r.x0} y={r.y} width={r.x1 - r.x0} height={1.02} fill={CREAM} />
        ))}
      </g>
      {LETTERS.map((l, i) => {
        const drop = spring({
          frame: frame - 12 - i * 4,
          fps,
          config: { damping: 9, stiffness: 200 },
        });
        return (
          <g
            key={l.ch}
            opacity={drop > 0.01 ? 1 : 0}
            transform={`translate(${l.x} ${WORD_Y - (1 - drop) * 30}) rotate(${(1 - drop) * (i % 2 ? 25 : -25)} 5 7)`}
          >
            {l.px.map((p, j) => (
              <rect key={`s${j}`} x={p.x + 1} y={p.y + 1} width={2} height={2} fill={TOMATO} />
            ))}
            {l.px.map((p, j) => (
              <rect key={`i${j}`} x={p.x} y={p.y} width={2} height={2} fill={INK} />
            ))}
          </g>
        );
      })}
      <rect x={31 - 15 * bar} y={WORD_Y + 17} width={30 * bar} height={2} fill={MUSTARD} />
    </svg>
  );
};
