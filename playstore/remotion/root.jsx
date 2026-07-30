import React from "react";
import {Composition} from "remotion";
import {PromoVideo} from "./video";

export const PromoRoot = () => (
  <Composition
    id="AIWorkStudioPromo"
    component={PromoVideo}
    durationInFrames={900}
    fps={30}
    width={1920}
    height={1080}
  />
);
