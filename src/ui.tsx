/** @jsx h */
import {
  Button,
  Checkbox,
  Container,
  IconFrame32,
  MiddleAlign,
  Text,
  render,
  Textbox,
  VerticalSpace,
  Stack,
  Inline,
  Divider,
  Disclosure,
} from "@create-figma-plugin/ui";
import { h } from "preact";
import { useCallback, useEffect, useReducer, useState } from "preact/hooks";
import { emit, on } from "@create-figma-plugin/utilities";
import { RenderedImage, RenderedImageScale, Settings } from "./types";
import JSZip from "jszip";
import styles from "./styles.css";
import {
  RenderRequestHandler,
  RenderResultHandler,
  SaveSettings,
  SelectionChanged,
} from "./events";
import { fileNameAndroid, fileNameWeb } from "./utils";

function createZip(
  b64WebP: { data: string; scale: RenderedImageScale }[],
  baseName: string,
  isAndroidExport: boolean
): JSZip {
  const zip = new JSZip();
  b64WebP.forEach(({ data, scale }) => {
    const fileName = isAndroidExport
      ? fileNameAndroid(scale, baseName)
      : fileNameWeb(scale, baseName);

    zip.file(`${fileName}.webp`, data, { base64: true });
  });
  return zip;
}

async function downloadZip(zip: JSZip, name: string) {
  const b64Zip = await zip.generateAsync({ type: "base64" });
  downloadFile(b64Zip, name, "zip");
}

function downloadFile(b64Data: string, name: string, type: "webp" | "zip") {
  const link = document.createElement("a");
  link.download = name;
  link.href = `data:${
    type == "webp" ? "image" : "application"
  }/${type};base64,${b64Data}`;
  link.click();
}

function Preview(settings: Settings) {
  const [useAndroidExport, setUseAndroidExport] = useState(
    settings.useAndroidExport
  );
  const [exportScales, setExportScales] = useState(
    new Map(settings.selectedExportScales)
  );
  useEffect(() => {
    emit<SaveSettings>("SAVE_SETTINGS", {
      useAndroidExport: useAndroidExport,
      selectedExportScales: Array.from(exportScales, ([scale, checked]) => [
        scale,
        checked,
      ]),
    });
  }, [useAndroidExport, exportScales]);

  const [fileName, setFileName] = useState("");
  const [previewImage, setPreviewImage] = useState<Uint8Array | undefined>(
    undefined
  );
  const [inProgress, setInProgress] = useState(false);

  function exportButtonDisabled() {
    let anyChecked = false;
    exportScales.forEach((checked, _) => {
      if (checked) {
        anyChecked = true;
      }
    });
    return (
      previewImage == undefined ||
      fileName.length == 0 ||
      inProgress ||
      !anyChecked
    );
  }

  useEffect(() => {
    const deleteSelectionChangedHandler = on<SelectionChanged>(
      "SELECTION_CHANGED",
      function (name: string | undefined, image: Uint8Array | undefined) {
        if (name === undefined || image === undefined) {
          setPreviewImage(undefined);
          setFileName("");
        } else {
          setPreviewImage(image);
          setFileName(name);
        }
      }
    );

    const deleteRenderResultHandler = on<RenderResultHandler>(
      "RENDER_RESULT",
      function (rimages: RenderedImage[]) {
        new Promise(() => {
          const name = fileName;
          const android = useAndroidExport;

          const b64WebP: { data: string; scale: RenderedImageScale }[] = [];
          rimages.forEach((rimg) => {
            const canvas = document.createElement(
              "canvas"
            ) as HTMLCanvasElement;
            const ctx = canvas.getContext("2d");
            const blob = new Blob([rimg.image], { type: "image/png" });
            const image = new Image();

            image.src = URL.createObjectURL(blob);
            image.onload = async () => {
              canvas.width = image.width;
              canvas.height = image.height;
              ctx?.drawImage(image, 0, 0);
              b64WebP.push({
                data: canvas.toDataURL("image/webp", 1.0).split(",")[1],
                scale: rimg.scale,
              });

              // finally generate zip and download
              if (rimages.length == 1 && b64WebP.length == 1) {
                downloadFile(b64WebP[0].data, name, "webp");

                setInProgress(false);
              } else if (b64WebP.length == rimages.length) {
                await downloadZip(createZip(b64WebP, name, android), name);

                setInProgress(false);
              }
            };
          });
        });
      }
    );

    return () => {
      deleteSelectionChangedHandler();
      deleteRenderResultHandler();
    };
  });

  useEffect(() => {
    const element = document.getElementById(
      "img-preview"
    ) as HTMLImageElement | null;
    if (element === null) {
      return;
    }
    if (previewImage === undefined) {
      element.src = "";
    } else {
      const blob = new Blob([previewImage], { type: "image/png" });
      element.src = URL.createObjectURL(blob);
    }
  }, [previewImage]);

  const clickDownloadZip = useCallback(() => {
    setInProgress(true);
    const exp = Array.from(exportScales.entries())
      .filter(([_, toggled]) => toggled)
      .map(([scale, _]) => scale);
    emit<RenderRequestHandler>("RENDER_REQUEST", exp);
  }, [exportScales]);

  let preview;
  if (previewImage !== undefined) {
    preview = (
      <img id={"img-preview"} alt={""} src={undefined} class={styles.preview} />
    );
  } else {
    preview = (
      <div class={styles.preview_no_selection}>
        <IconFrame32 />
        <div>Select frame</div>
      </div>
    );
  }

  const [showPreferences, setShowPreferences] = useState(false);
  return (
    <Container space="medium">
      <VerticalSpace space="medium" />
      <MiddleAlign style={"height: auto;"}>{preview}</MiddleAlign>
      <VerticalSpace space="large" />
      <Textbox
        placeholder="Enter filename"
        variant="border"
        onInput={(event) => setFileName(event.currentTarget.value)}
        value={fileName}
      />
      <VerticalSpace space="small" />
      <Button
        fullWidth
        secondary
        loading={inProgress}
        disabled={exportButtonDisabled()}
        onClick={() => clickDownloadZip()}
      >
        Export
      </Button>
      <VerticalSpace space="large" />
      <Disclosure
        onClick={(event) => {
          setShowPreferences(!showPreferences);
        }}
        open={showPreferences}
        title="Preferences"
      >
        <VerticalSpace space="small" />
        <Text>Resolution</Text>
        <VerticalSpace space="small" />
        <Inline space="small">
          {ScaleExportToggle(
            exportScales.get(1) ?? false,
            1,
            (scale, checked) => {
              setExportScales((prev) => new Map([...prev, [scale, checked]]));
            }
          )}
          {ScaleExportToggle(
            exportScales.get(1.5) ?? false,
            1.5,
            (scale, checked) => {
              setExportScales((prev) => new Map([...prev, [scale, checked]]));
            }
          )}
          {ScaleExportToggle(
            exportScales.get(2) ?? false,
            2,
            (scale, checked) => {
              setExportScales((prev) => new Map([...prev, [scale, checked]]));
            }
          )}
          {ScaleExportToggle(
            exportScales.get(3) ?? false,
            3,
            (scale, checked) => {
              setExportScales((prev) => new Map([...prev, [scale, checked]]));
            }
          )}
          {ScaleExportToggle(
            exportScales.get(4) ?? false,
            4,
            (scale, checked) => {
              setExportScales(new Map(exportScales.set(scale, checked)));
            }
          )}
        </Inline>
        <VerticalSpace space="small" />
        <Divider />
        <VerticalSpace space="small" />
        <Checkbox
          onChange={(event) => setUseAndroidExport(event.currentTarget.checked)}
          value={useAndroidExport}
        >
          <Text>Export for Android</Text>
        </Checkbox>
      </Disclosure>
      <VerticalSpace space="medium" />
    </Container>
  );
}

function ScaleExportToggle(
  checked: boolean,
  scale: RenderedImageScale,
  setScale: (scale: RenderedImageScale, checked: boolean) => void
) {
  return (
    <Checkbox
      onChange={(event) => setScale(scale, event.currentTarget.checked)}
      value={checked}
    >
      <Text>{scale}x</Text>
    </Checkbox>
  );
}

export default render(Preview);
