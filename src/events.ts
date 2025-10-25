import { EventHandler } from "@create-figma-plugin/utilities";
import { RenderedImage, RenderedImageScale, SelectedNode, Settings, WindowSize } from "./types";

export interface Resize extends EventHandler {
  name: "RESIZE";
  handler: (size: WindowSize) => void;
}

export interface SelectionChanged extends EventHandler {
  name: "SELECTION_CHANGED";
  handler: (totalPixelSize: number, nodes: SelectedNode[], previewImages: Uint8Array[]) => void;
}

export interface RenderRequestHandler extends EventHandler {
  name: "RENDER_REQUEST";
  handler: (scales: RenderedImageScale[]) => void;
}

export interface RenderResultHandler extends EventHandler {
  name: "RENDER_RESULT";
  handler: (nodes: { name: string; images: RenderedImage[] }[]) => void;
}

export interface SaveSettings extends EventHandler {
  name: "SAVE_SETTINGS";
  handler: (settings: Settings) => void;
}
