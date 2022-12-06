import { emit, on, showUI } from "@create-figma-plugin/utilities";
import {
  RenderedImage,
  RenderRequestHandler,
  RenderResultHandler,
  SaveSettings,
  SelectionChanged,
  Settings,
} from "./types";

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
  on<RenderRequestHandler>("RENDER_REQUEST", () => {
    new Promise(() => {
      if (figma.currentPage.selection.length > 0) {
        const node = figma.currentPage.selection[0];

        Promise.all([
          node.exportAsync(exportSize(1)),
          node.exportAsync(exportSize(1.5)),
          node.exportAsync(exportSize(2)),
          node.exportAsync(exportSize(3)),
          node.exportAsync(exportSize(4)),
        ]).then((pngs) => {
          const scales = [1, 1.5, 2, 3, 4];

          emit<RenderResultHandler>(
            "RENDER_RESULT",
            scales.map((scale, index) => {
              return { scale: scale, image: pngs[index] } as RenderedImage;
            })
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

  //figma.clientStorage.deleteAsync("settings")

  figma.clientStorage
    .getAsync("settings")
    .then((settings: Settings | undefined) => {
      if (settings === undefined) {
        showUI({ width: 320, height: 320 }, {
          useAndroidExport: false,
        } as Settings);
      } else {
        showUI({ width: 320, height: 320 }, settings);
      }
    });
}
