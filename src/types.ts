export type RenderedImageScale = number;

export interface RenderedImage {
  scale: RenderedImageScale;
  image: Uint8Array;
}

export interface SelectedNode {
  id: string;
  name: string;
}

export type SettingsExportScales = RenderedImageScale;
export interface SettingsNamingConvention {
  transform: "lowercase" | "case-sensitive" | "no-transform";
  replacement: string;
}

export interface WindowSize {
  w: number;
  h: number;
}

export interface SettingsOld {
  useAndroidExport: boolean;
  selectedExportScales: [number, boolean][];
  useOptimizedSize: boolean;
}

export interface Settings {
  pluginWindowSize: WindowSize;
  exportStructure: "android" | "ios" | "web" | "flat";
  exportQuality: number;
  selectedExportScalesV2: SettingsExportScales[];
  namingConvention: SettingsNamingConvention;
}
