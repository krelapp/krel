import "./index.css";
import { Composition, Folder } from "remotion";
import { KrelVideo, VIDEO_DURATION, VIDEO_FPS } from "./KrelVideo";
import { Chitchat } from "./scenes/Chitchat";
import { EndCard } from "./scenes/EndCard";
import { Intro } from "./scenes/Intro";
import { TheRoom } from "./scenes/TheRoom";
import { Together } from "./scenes/Together";
import { f } from "./time";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="KREL-Scenes">
        <Composition
          id="Intro"
          component={Intro}
          durationInFrames={f(102)}
          fps={VIDEO_FPS}
          width={1920}
          height={1080}
        />
        <Composition
          id="TheRoom"
          component={TheRoom}
          durationInFrames={f(132)}
          fps={VIDEO_FPS}
          width={1920}
          height={1080}
        />
        <Composition
          id="Together"
          component={Together}
          durationInFrames={f(132)}
          fps={VIDEO_FPS}
          width={1920}
          height={1080}
        />
        <Composition
          id="Chitchat"
          component={Chitchat}
          durationInFrames={f(132)}
          fps={VIDEO_FPS}
          width={1920}
          height={1080}
        />
        <Composition
          id="EndCard"
          component={EndCard}
          durationInFrames={f(150)}
          fps={VIDEO_FPS}
          width={1920}
          height={1080}
        />
      </Folder>
      <Composition
        id="KREL"
        component={KrelVideo}
        durationInFrames={VIDEO_DURATION}
        fps={VIDEO_FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
