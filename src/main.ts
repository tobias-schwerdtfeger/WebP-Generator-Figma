import { emit, on, showUI } from "@create-figma-plugin/utilities";
import { RenderedImage, RenderedImageScale } from "./types";
import {
  RenderRequestHandler,
  RenderResultHandler,
  SaveSettings,
  SelectionChanged,
} from "./events";

function exportSize(size: number): ExportSettings {
  return {
    format: "PNG",
    constraint: {
      type: "SCALE",
      value: size,
    },
  };
}

export default function () {
  on<RenderRequestHandler>("RENDER_REQUEST", (scales: RenderedImageScale[]) => {
    new Promise(() => {
      if (figma.currentPage.selection.length > 0) {
        const node = figma.currentPage.selection[0];

        Promise.all(scales.map((s) => node.exportAsync(exportSize(s)))).then(
          (pngs) => {
            emit<RenderResultHandler>(
              "RENDER_RESULT",
              scales.map((scale, index) => {
                return { scale: scale, image: pngs[index] } as RenderedImage;
              })
            );
          }
        );
      } else {
        emit<SelectionChanged>("SELECTION_CHANGED", undefined, undefined);
      }
    });
  });

  on<SaveSettings>("SAVE_SETTINGS", async (settings) => {
    await figma.clientStorage.setAsync("settings", settings);
  });

  figma.on("selectionchange", async () => {
    if (figma.currentPage.selection.length > 0) {
      const node = figma.currentPage.selection[0];
      const regexName = /[^a-zA-Z0-9]+/g;
      const newName = node.name.replace(regexName, "_").toLowerCase();

      emit<SelectionChanged>(
        "SELECTION_CHANGED",
        newName,
        await node.exportAsync(exportSize(1))
      );
    } else {
      emit<SelectionChanged>("SELECTION_CHANGED", undefined, undefined);
    }
  });

  // figma.clientStorage.deleteAsync("settings")

  figma.clientStorage.getAsync("settings").then((settings: any | undefined) => {
    // never had the plugin before
    if (settings === undefined) {
      settings = {};
    }
    // V0
    if (!("useAndroidExport" in settings)) {
      settings["useAndroidExport"] = false;
    }
    // V1
    if (!("selectedExportScales" in settings)) {
      // if android export is selected, preselect 1.5 scale
      const androidScale15 = settings["useAndroidExport"];
      settings["selectedExportScales"] = [
        [1, true],
        [1.5, androidScale15],
        [2, true],
        [3, true],
        [4, true],
      ];
    }
    showUI({ width: 320, height: 360 }, settings);
  });
}
