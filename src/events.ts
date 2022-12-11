import { EventHandler } from "@create-figma-plugin/utilities";
import { RenderedImage, Settings } from "./types";

export interface SelectionChanged extends EventHandler {
  name: "SELECTION_CHANGED";
  handler: (name: string | undefined, image: Uint8Array | undefined) => void;
}

export interface RenderRequestHandler extends EventHandler {
  name: "RENDER_REQUEST";
  handler: () => void;
}

export interface RenderResultHandler extends EventHandler {
  name: "RENDER_RESULT";
  handler: (images: RenderedImage[]) => void;
}

export interface SaveSettings extends EventHandler {
  name: "SAVE_SETTINGS";
  handler: (settings: Settings) => void;
}
