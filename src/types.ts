export type RenderedImageScale = 1 | 1.5 | 2 | 3 | 4;

export type RenderedImage = {
  scale: RenderedImageScale;
  image: Uint8Array;
};

export type Settings = {
  useAndroidExport: boolean;
};
