import { TransitionSeries, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { AbsoluteFill } from "remotion";
import { Chitchat } from "./scenes/Chitchat";
import { EndCard } from "./scenes/EndCard";
import { Intro } from "./scenes/Intro";
import { Soundtrack } from "./Soundtrack";
import { VIDEO_FPS, f } from "./time";
import { TheRoom } from "./scenes/TheRoom";
import { Together } from "./scenes/Together";

export const KrelVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#1e1a17" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={f(102)} name="Intro">
          <Intro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: f(12) })}
        />
        <TransitionSeries.Sequence durationInFrames={f(132)} name="The room">
          <TheRoom />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: f(12) })}
        />
        <TransitionSeries.Sequence durationInFrames={f(132)} name="Together">
          <Together />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: f(12) })}
        />
        <TransitionSeries.Sequence durationInFrames={f(132)} name="Chitchat">
          <Chitchat />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-top-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: f(12) })}
        />
        <TransitionSeries.Sequence durationInFrames={f(150)} name="End">
          <EndCard />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Soundtrack />
    </AbsoluteFill>
  );
};

export { VIDEO_FPS };
export const VIDEO_DURATION = f(600);
