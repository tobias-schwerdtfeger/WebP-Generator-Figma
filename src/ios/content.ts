import { RenderedImageScale } from "../types";

export const iosContentJson = (name: string, files: { scale: RenderedImageScale }[]) => {
  const images = files
    .filter(({ scale }) => {
      switch (scale) {
        case 1:
        case 2:
        case 3:
          return true;
        default:
          return false;
      }
    })
    .map(({ scale }) => {
      return {
        idiom: "universal",
        scale: `${scale}x`,
        filename: scale === 1.0 ? `${name}.webp` : `${name}@${scale}x.webp`,
      };
    });

  return JSON.stringify({
    images,
    info: {
      version: 1,
      author: "WebP Exporter",
    },
  });
};
