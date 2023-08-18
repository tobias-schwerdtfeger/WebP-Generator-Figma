export type RenderedImageScale = 1 | 1.5 | 2 | 3 | 4;

export type RenderedImage = {
  scale: RenderedImageScale;
  image: Uint8Array;
};

export type SettingsExportScales = [RenderedImageScale, boolean];
export type SettingsNamingConvention = {
  transform: "lowercase" | "case-sensitive" | "no-transform";
  replacement: string;
};

export type Settings = {
  useAndroidExport: boolean;
  useOptimizedSize: boolean;
  selectedExportScales: SettingsExportScales[];
  namingConvention: SettingsNamingConvention;
};
