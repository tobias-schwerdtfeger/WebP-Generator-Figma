import { RenderedImageScale } from "./types";

export function fileNameAndroid(
  scale: RenderedImageScale,
  name: string,
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
  name: string,
  replacement: string,
): string {
  let suffix;
  switch (scale) {
    case 1:
      suffix = "1x";
      break;
    case 1.5:
      suffix = "1_5x";
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
  return `${name}/${name}${replacement}${suffix}`;
}
