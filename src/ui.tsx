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
  Inline,
  Divider,
  Disclosure,
  Toggle,
  DropdownOption,
  Dropdown,
  Bold,
} from "@create-figma-plugin/ui";
import { h } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { emit, on } from "@create-figma-plugin/utilities";
import {
  RenderedImage,
  RenderedImageScale,
  Settings,
  SettingsNamingConvention,
} from "./types";
import JSZip from "jszip";
import styles from "./styles.css";
import donateLogo from "./ko-fi-logo.png";
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
  isAndroidExport: boolean,
  replacement: string,
): JSZip {
  const zip = new JSZip();
  b64WebP.forEach(({ data, scale }) => {
    const fileName = isAndroidExport
      ? fileNameAndroid(scale, baseName)
      : fileNameWeb(scale, baseName, replacement);

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
    settings.useAndroidExport,
  );
  const [exportScales, setExportScales] = useState(
    new Map(settings.selectedExportScales),
  );
  const [useOptimizedSize, setUseOptimizedSize] = useState<boolean>(
    settings.useOptimizedSize,
  );
  const [namingConvention, setNamingConvention] =
    useState<SettingsNamingConvention>(settings.namingConvention);

  useEffect(() => {
    emit<SaveSettings>("SAVE_SETTINGS", {
      useAndroidExport: useAndroidExport,
      useOptimizedSize: useOptimizedSize,
      selectedExportScales: Array.from(exportScales, ([scale, checked]) => [
        scale,
        checked,
      ]),
      namingConvention: namingConvention,
    });
  }, [useAndroidExport, exportScales, useOptimizedSize, namingConvention]);

  const [originalFileName, setOriginalFileName] = useState("");
  const [fileName, setFileName] = useState("");
  const [previewImage, setPreviewImage] = useState<Uint8Array | undefined>(
    undefined,
  );
  const [inProgress, setInProgress] = useState(false);

  function exportButtonDisabled() {
    let anyChecked = false;
    exportScales.forEach((checked) => {
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

  function convertName(
    name: string,
    convention: SettingsNamingConvention,
  ): string {
    let newName = name;
    if (convention.transform !== "no-transform") {
      const regexName = /[^a-zA-Z0-9]+/g;
      newName = newName.replace(regexName, convention.replacement);
    }
    if (convention.transform === "lowercase") {
      newName = newName.toLowerCase();
    }
    return newName;
  }

  useEffect(() => {
    setFileName(convertName(originalFileName, namingConvention));
  }, [namingConvention]);

  useEffect(() => {
    const deleteSelectionChangedHandler = on<SelectionChanged>(
      "SELECTION_CHANGED",
      function (name: string | undefined, image: Uint8Array | undefined) {
        if (name === undefined || image === undefined) {
          setPreviewImage(undefined);
          setFileName("");
        } else {
          setPreviewImage(image);
          setOriginalFileName(name);
          setFileName(convertName(name, namingConvention));
        }
      },
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
              "canvas",
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
                data: canvas
                  .toDataURL("image/webp", useOptimizedSize ? 0.9 : 1.0)
                  .split(",")[1],
                scale: rimg.scale,
              });

              // finally, generate zip and download
              if (rimages.length == 1 && b64WebP.length == 1) {
                downloadFile(b64WebP[0].data, name, "webp");

                setInProgress(false);
              } else if (b64WebP.length == rimages.length) {
                await downloadZip(
                  createZip(
                    b64WebP,
                    name,
                    android,
                    namingConvention.replacement,
                  ),
                  name,
                );

                setInProgress(false);
              }
            };
          });
        });
      },
    );

    return () => {
      deleteSelectionChangedHandler();
      deleteRenderResultHandler();
    };
  });

  useEffect(() => {
    const element = document.getElementById(
      "img-preview",
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
      .filter(([, toggled]) => toggled)
      .map(([scale]) => scale);
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

  const options: Array<DropdownOption<SettingsNamingConvention["transform"]>> =
    [
      {
        text: "Preserve Layer Name",
        value: "no-transform",
      },
      {
        text: "convert to lower case",
        value: "lowercase",
      },
      {
        text: "Convert to Case Sensitive",
        value: "case-sensitive",
      },
    ];

  const [showPreferences, setShowPreferences] = useState(false);
  return (
    <Container space="medium">
      <VerticalSpace space="medium" />
      <MiddleAlign style={"height: auto;"}>{preview}</MiddleAlign>
      <VerticalSpace space="large" />
      <Textbox
        placeholder="Enter filename"
        variant="border"
        onInput={(event) => {
          const name = event.currentTarget.value;
          // override with user input
          setOriginalFileName(name);
          setFileName(name);
        }}
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
        onClick={() => {
          setShowPreferences(!showPreferences);
        }}
        open={showPreferences}
        title="Preferences"
      >
        <VerticalSpace space="small" />
        <Text>
          <Bold>Quality and Resolution</Bold>
        </Text>
        <VerticalSpace space="medium" />
        <Toggle
          onValueChange={(value) => setUseOptimizedSize(value)}
          value={useOptimizedSize}
        >
          <Text>Optimized Size</Text>
        </Toggle>
        <VerticalSpace space="small" />
        <Inline space="small">
          {ScaleExportToggle(
            exportScales.get(1) ?? false,
            1,
            (scale, checked) => {
              setExportScales((prev) => new Map([...prev, [scale, checked]]));
            },
          )}
          {ScaleExportToggle(
            exportScales.get(1.5) ?? false,
            1.5,
            (scale, checked) => {
              setExportScales((prev) => new Map([...prev, [scale, checked]]));
            },
          )}
          {ScaleExportToggle(
            exportScales.get(2) ?? false,
            2,
            (scale, checked) => {
              setExportScales((prev) => new Map([...prev, [scale, checked]]));
            },
          )}
          {ScaleExportToggle(
            exportScales.get(3) ?? false,
            3,
            (scale, checked) => {
              setExportScales((prev) => new Map([...prev, [scale, checked]]));
            },
          )}
          {ScaleExportToggle(
            exportScales.get(4) ?? false,
            4,
            (scale, checked) => {
              setExportScales(new Map(exportScales.set(scale, checked)));
            },
          )}
        </Inline>
        <VerticalSpace space="small" />

        <Divider />
        <VerticalSpace space="medium" />
        <Text>
          <Bold>Naming</Bold>
        </Text>
        <VerticalSpace space="medium" />
        <div className={styles.naming}>
          <Dropdown
            onChange={(value) =>
              setNamingConvention((v) => {
                return {
                  transform: value.currentTarget
                    .value as SettingsNamingConvention["transform"],
                  replacement: v.replacement,
                };
              })
            }
            options={options}
            value={namingConvention.transform}
            variant="border"
          />
          <Textbox
            onChange={(value) =>
              setNamingConvention((v) => {
                return {
                  transform: v.transform,
                  replacement: value.currentTarget.value,
                };
              })
            }
            value={namingConvention.replacement}
            variant="border"
            placeholder="Divider"
          />
        </div>
        <VerticalSpace space="small" />

        <Divider />
        <VerticalSpace space="medium" />
        <Text>
          <Bold>Folder Structure</Bold>
        </Text>
        <VerticalSpace space="medium" />
        <Toggle
          onValueChange={(checked) => setUseAndroidExport(checked)}
          value={useAndroidExport}
        >
          <Text>Export for Android</Text>
        </Toggle>
      </Disclosure>
      <VerticalSpace space="extraLarge" />
      {DonateLogo()}
      <VerticalSpace space="medium" />
    </Container>
  );
}

function ScaleExportToggle(
  checked: boolean,
  scale: RenderedImageScale,
  setScale: (scale: RenderedImageScale, checked: boolean) => void,
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

function DonateLogo() {
  return (
    <a
      id={styles.donate}
      href="https://ko-fi.com/webpgen"
      target="_blank"
      rel="noreferrer"
    >
      <img src={donateLogo} alt="Donate" />
      Donate
    </a>
  );
}

export default render(Preview);
