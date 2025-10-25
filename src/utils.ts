import { RenderedImageScale, SettingsNamingConvention } from "./types";

export function fileNameAndroid(scale: RenderedImageScale, name: string): string | undefined {
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
    default:
      return undefined;
  }
  return `drawable-${suffix}/${name}`;
}

export function fileNameWeb(scale: RenderedImageScale, name: string, replacement: string): string {
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

export function fileNameFlat(scale: RenderedImageScale, name: string, replacement: string): string {
  const scaleStr = scale.toString().replace(".", "_");
  return `${name}${replacement}${scaleStr}x`;
}

export function fileNameIos(scale: RenderedImageScale, name: string): string | undefined {
  let suffix;
  switch (scale) {
    case 1:
      suffix = "";
      break;
    case 2:
      suffix = "@2x";
      break;
    case 3:
      suffix = "@3x";
      break;
    default:
      return undefined;
  }
  return `${name}/${name}${suffix}`;
}

export function convertFileName(name: string, convention: SettingsNamingConvention): string {
  let newName = name;
  if (convention.transform !== "no-transform") {
    const regexName = /[^a-zA-Z0-9]+/g;
    newName = newName.replace(regexName, convention.replacement);
  }
  if (convention.transform === "lowercase") {
    newName = newName.toLowerCase();
  }
  // let's limit the file name here; otherwise it might happen that the zip is unpackable
  return newName.slice(0, 200);
}
