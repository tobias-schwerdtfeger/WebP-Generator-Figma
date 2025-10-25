import { emit, on, showUI } from "@create-figma-plugin/utilities";
import { RenderedImageScale, Settings, SettingsNamingConvention, SettingsOld, WindowSize } from "./types";
import { RenderRequestHandler, RenderResultHandler, Resize, SaveSettings, SelectionChanged } from "./events";

function exportSize(type: "SCALE" | "HEIGHT", value: number): ExportSettings {
  return {
    format: "PNG",
    useAbsoluteBounds: true,
    constraint: {
      type: type,
      value: value,
    },
  };
}

let selectedNodeIds = new Map<string, number>();

export default function () {
  on<Resize>("RESIZE", (size: WindowSize) => {
    figma.ui.resize(size.w, size.h);
  });
  on<RenderRequestHandler>("RENDER_REQUEST", (scales: RenderedImageScale[]) => {
    if (figma.currentPage.selection.length > 0) {
      Promise.all(
        figma.currentPage.selection.map(async (node) => {
          const images = await Promise.all(
            scales.map(async (s) => {
              const img = await node.exportAsync(exportSize("SCALE", s));
              return {
                scale: s,
                image: img,
              };
            }),
          );
          return {
            name: node.name,
            images: images,
          };
        }),
      )
        .then((result) => {
          emit<RenderResultHandler>("RENDER_RESULT", result);
        })
        .catch((reason) => {
          console.error("Error while rendering images", reason);
        });
    } else {
      emit<SelectionChanged>("SELECTION_CHANGED", 0, [], []);
    }
  });

  on<SaveSettings>("SAVE_SETTINGS", (settings) => {
    void figma.clientStorage.setAsync("settings", settings);
  });

  figma.on("selectionchange", async () => {
    if (figma.currentPage.selection.length > 0) {
      const css = await figma.currentPage.selection[0].getCSSAsync();
      console.log(css);
      const g = figma.currentPage.selection[0];
      console.log(g);
      console.log(await figma.variables.getLocalVariablesAsync("FLOAT"));
      if (g.type === "FRAME") {
        console.log(g.inferredAutoLayout?.layoutWrap);

        if (typeof g.fillStyleId === "string") {
          console.log(await figma.getStyleByIdAsync(g.fillStyleId));
        }
      }

      const now = Date.now();
      const nodesWithSelectionHistory = figma.currentPage.selection
        .map((node, index) => {
          const tm = selectedNodeIds.get(node.id) ?? now + index;
          return { node, tm };
        })
        .sort((a, b) => b.tm - a.tm);

      const previewImages = await Promise.all(
        nodesWithSelectionHistory.slice(0, 3).map(async ({ node }) => {
          return await node.exportAsync(exportSize("HEIGHT", 150));
        }),
      );

      const totalPixelSize = figma.currentPage.selection.reduce((previousValue, currentValue) => {
        const size = previousValue + Math.floor(currentValue.width) * Math.floor(currentValue.height);
        // let's not have silly bugs in the future and eliminate this edge case here
        return Number.isSafeInteger(size) ? size : Number.MAX_SAFE_INTEGER;
      }, 0);

      const nodes = figma.currentPage.selection.map((node) => {
        return { id: node.id, name: node.name };
      });

      selectedNodeIds = new Map(nodesWithSelectionHistory.map(({ node, tm }) => [node.id, tm]));

      emit<SelectionChanged>("SELECTION_CHANGED", totalPixelSize, nodes, previewImages);
    } else {
      selectedNodeIds = new Map();

      emit<SelectionChanged>("SELECTION_CHANGED", 0, [], []);
    }
  });

  // figma.clientStorage.deleteAsync("settings")
  //
  // return;

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  figma.clientStorage.getAsync("settings").then((settings: Partial<Settings & SettingsOld> | undefined) => {
    // never had the plugin before
    settings ??= {};
    // V0
    if (!("useAndroidExport" in settings)) {
      settings.useAndroidExport = false;
    }
    // V1
    if (!("selectedExportScales" in settings)) {
      // if android export is selected, preselect 1.5 scale
      const androidScale15 = settings.useAndroidExport ?? false;
      settings.selectedExportScales = [
        [1, true],
        [1.5, androidScale15],
        [2, true],
        [3, true],
        [4, true],
      ];
    }
    // V2
    if (!("useOptimizedSize" in settings)) {
      settings.useOptimizedSize = true;
    }
    // V3
    if (!("namingConvention" in settings)) {
      settings.namingConvention = {
        transform: "lowercase",
        replacement: "_",
      } as SettingsNamingConvention;
    }
    // V4
    if (!("exportQuality" in settings)) {
      settings.exportQuality = settings.useOptimizedSize ? 90 : 100;
    }
    // V5
    if (!("exportStructure" in settings)) {
      settings.exportStructure = settings.useAndroidExport ? "android" : "web";
    }
    if (!("selectedExportScalesV2" in settings)) {
      const oldScales = settings.selectedExportScales ?? [];
      settings.selectedExportScalesV2 = oldScales.filter(([, enabled]) => enabled).map(([scale]) => scale);
    }
    if (!("pluginWindowSize" in settings)) {
      settings.pluginWindowSize = {
        w: 320,
        h: 680,
      };
    }
    showUI({ width: settings.pluginWindowSize?.w ?? 320, height: settings.pluginWindowSize?.h ?? 680 }, settings);
  });
}
