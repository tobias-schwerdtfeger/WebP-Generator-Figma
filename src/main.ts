import { emit, on, showUI } from "@create-figma-plugin/utilities";
import {
  RenderedImage,
  RenderedImageScale,
  SettingsNamingConvention,
} from "./types";
import {
  RenderRequestHandler,
  RenderResultHandler,
  SaveSettings,
  SelectionChanged,
} from "./events";

function exportSize(type: "SCALE" | "HEIGHT", value: number): ExportSettings {
  return {
    format: "PNG",
    constraint: {
      type: type,
      value: value,
    },
  };
}

export default function () {
  on<RenderRequestHandler>("RENDER_REQUEST", (scales: RenderedImageScale[]) => {
    new Promise(() => {
      if (figma.currentPage.selection.length > 0) {
        const node = figma.currentPage.selection[0];

        Promise.all(
          scales.map((s) => node.exportAsync(exportSize("SCALE", s))),
        ).then((pngs) => {
          emit<RenderResultHandler>(
            "RENDER_RESULT",
            scales.map((scale, index) => {
              return { scale: scale, image: pngs[index] } as RenderedImage;
            }),
          );
        });
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

      emit<SelectionChanged>(
        "SELECTION_CHANGED",
        node.name,
        await node.exportAsync(exportSize("HEIGHT", 150)),
      );
    } else {
      emit<SelectionChanged>("SELECTION_CHANGED", undefined, undefined);
    }
  });

  // figma.clientStorage.deleteAsync("settings")
  //
  // return;

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
    // V2
    if (!("useOptimizedSize" in settings)) {
      settings["useOptimizedSize"] = true;
    }
    // V3
    if (!("namingConvention" in settings)) {
      settings["namingConvention"] = {
        transform: "lowercase",
        replacement: "_",
      } as SettingsNamingConvention;
    }
    showUI({ width: 320, height: 380 }, settings);
  });
}
