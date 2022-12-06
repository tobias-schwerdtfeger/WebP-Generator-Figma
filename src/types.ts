import { EventHandler } from "@create-figma-plugin/utilities";

export function fileNameAndroid(
  scale: RenderedImageScale,
  name: string
): string {
  let suffix;
  switch (scale) {
    case 1:
      suffix = "mdpi";
      break;
    case 1.5:
      suffix = "hdpi";
      break;
    case 2:
      suffix = "xhdpi";
      break;
    case 3:
      suffix = "xxhdpi";
      break;
    case 4:
      suffix = "xxxhdpi";
      break;
  }
  return `drawable-${suffix}/${name}`;
}

export function fileNameWeb(
  scale: RenderedImageScale,
  name: string
): string | undefined {
  if (scale == 1.5) {
    return undefined;
  }
  let suffix;
  switch (scale) {
    case 1:
      suffix = "1x";
      break;
    case 2:
      suffix = "2x";
      break;
    case 3:
      suffix = "3x";
      break;
    case 4:
      suffix = "4x";
      break;
  }
  return `${name}/${name}_${suffix}`;
}

export interface SelectionChanged extends EventHandler {
  name: "SELECTION_CHANGED";
  handler: (name: string | undefined, image: Uint8Array | undefined) => void;
}

export interface RenderRequestHandler extends EventHandler {
  name: "RENDER_REQUEST";
  handler: () => void;
}

export type RenderedImageScale = 1 | 1.5 | 2 | 3 | 4;

export type RenderedImage = {
  scale: RenderedImageScale;
  image: Uint8Array;
};

export interface RenderResultHandler extends EventHandler {
  name: "RENDER_RESULT";
  handler: (images: RenderedImage[]) => void;
}

export type Settings = {
  useAndroidExport: boolean;
};

export interface SaveSettings extends EventHandler {
  name: "SAVE_SETTINGS";
  handler: (settings: Settings) => void;
}
