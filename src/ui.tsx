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
  RangeSlider,
  TextboxNumeric,
  Banner,
  IconWarning32,
  IconInfo32,
} from "@create-figma-plugin/ui";
import { h } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { emit, on } from "@create-figma-plugin/utilities";
import {
  RenderedImage,
  RenderedImageScale,
  SelectedNode,
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
import { convertFileName, fileNameAndroid, fileNameWeb } from "./utils";

const MaxPixelSize = 5e7;

function zipFiles(
  zip: JSZip,
  webp: { data: Blob; scale: RenderedImageScale }[],
  baseName: string,
  isAndroidExport: boolean,
  replacement: string,
): JSZip {
  webp.forEach(({ data, scale }) => {
    const fileName = isAndroidExport
      ? fileNameAndroid(scale, baseName)
      : fileNameWeb(scale, baseName, replacement);

    zip.file(`${fileName}.webp`, data);
  });
  return zip;
}

async function downloadZip(zip: JSZip, name: string) {
  downloadFile(await zip.generateAsync({ type: "blob" }), name);
}

function downloadFile(data: Blob, name: string) {
  const link = document.createElement("a");
  link.download = name;
  link.href = URL.createObjectURL(data);
  link.click();
}

async function compressImage(data: Uint8Array, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  const blob = new Blob([data], { type: "image/png" });
  const image = new Image();

  image.src = URL.createObjectURL(blob);
  return await new Promise<Blob>((resolve, reject) => {
    image.onload = async () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx?.drawImage(image, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject("Couldn't create image");
        },
        "image/webp",
        quality,
      );
    };
  });
}

function Preview(settings: Settings) {
  const [useAndroidExport, setUseAndroidExport] = useState(
    settings.useAndroidExport,
  );
  const [exportScales, setExportScales] = useState(
    new Map(settings.selectedExportScales),
  );
  const [exportQuality, setExportQuality] = useState<number>(
    settings.exportQuality,
  );
  const [namingConvention, setNamingConvention] =
    useState<SettingsNamingConvention>(settings.namingConvention);

  useEffect(() => {
    emit<SaveSettings>("SAVE_SETTINGS", {
      useAndroidExport: useAndroidExport,
      exportQuality: exportQuality,
      selectedExportScales: Array.from(exportScales, ([scale, checked]) => [
        scale,
        checked,
      ]),
      namingConvention: namingConvention,
    });
  }, [useAndroidExport, exportScales, exportQuality, namingConvention]);

  const [showExportWarning, setShowExportWarning] = useState(false);
  const [originalFileName, setOriginalFileName] = useState("");
  const [fileName, setFileName] = useState("");
  const [selectedNodes, setSelectedNodes] = useState<SelectedNode[]>([]);
  const [previewImages, setPreviewImages] = useState<Uint8Array[]>([]);
  const [inProgress, setInProgress] = useState(false);

  function isExportButtonDisabled(): boolean {
    let anyChecked = false;
    exportScales.forEach((checked) => {
      if (checked) {
        anyChecked = true;
      }
    });
    return (
      setSelectedNodes.length == 0 ||
      fileName.length == 0 ||
      inProgress ||
      !anyChecked
    );
  }

  useEffect(() => {
    setFileName(convertFileName(originalFileName, namingConvention));
  }, [namingConvention]);

  useEffect(() => {
    const deleteSelectionChangedHandler = on<SelectionChanged>(
      "SELECTION_CHANGED",
      function (
        totalPixelSize: number,
        nodes: SelectedNode[],
        previewImages: Uint8Array[],
      ) {
        setShowExportWarning(totalPixelSize > MaxPixelSize);
        setSelectedNodes(nodes);
        if (nodes.length === 0) {
          setPreviewImages([]);
          setFileName("");
        } else {
          setPreviewImages(previewImages);
          setOriginalFileName(nodes[0].name);
          setFileName(convertFileName(nodes[0].name, namingConvention));
        }
      },
    );

    const deleteRenderResultHandler = on<RenderResultHandler>(
      "RENDER_RESULT",
      function (nodes: { name: string; images: RenderedImage[] }[]) {
        (async () => {
          const quality = exportQuality / 100.0;

          if (nodes.length == 1 && nodes[0].images.length == 1) {
            setInProgress(false);
            // special case
            const webp = await compressImage(nodes[0].images[0].image, quality);
            downloadFile(webp, fileName);
          } else {
            const zip = new JSZip();

            for (const node of nodes) {
              const webps = await Promise.all(
                node.images.map(async (img) => {
                  const webp = await compressImage(img.image, quality);
                  return {
                    data: webp,
                    scale: img.scale,
                  };
                }),
              );

              // mimic the existing behavior - with only one node, the input is considered
              const name =
                nodes.length == 1
                  ? fileName
                  : convertFileName(node.name, namingConvention);

              zipFiles(
                zip,
                webps,
                name,
                useAndroidExport,
                namingConvention.replacement,
              );
            }

            setInProgress(false);

            await downloadZip(
              zip,
              nodes.length == 1
                ? fileName
                : `export_${new Date().toISOString().replace(".", "-")}`,
            );
          }
        })();
      },
    );

    return () => {
      deleteSelectionChangedHandler();
      deleteRenderResultHandler();
    };
  });

  const clickDownloadZip = useCallback(() => {
    setInProgress(true);
    const exp = Array.from(exportScales.entries())
      .filter(([, toggled]) => toggled)
      .map(([scale]) => scale);
    emit<RenderRequestHandler>("RENDER_REQUEST", exp);
  }, [exportScales]);

  let preview;
  if (previewImages.length > 0) {
    preview = (
      <div className={styles.preview_stack}>
        {previewImages.toReversed().map((image, index) => {
          const blob = new Blob([image], { type: "image/png" });
          return (
            <img
              key={index}
              id={"img-preview"}
              alt={""}
              src={URL.createObjectURL(blob)}
              className={styles.preview}
            />
          );
        })}
      </div>
    );
  } else {
    preview = (
      <div class={styles.preview_no_selection}>
        <IconFrame32 />
        <div>Select frame</div>
      </div>
    );
  }

  const options: Array<DropdownOption> = [
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

  function setExportScale(scale: RenderedImageScale, checked: boolean) {
    setExportScales((prev) => new Map([...prev, [scale, checked]]));
  }

  const [showPreferences, setShowPreferences] = useState(false);
  return (
    <Container space="medium">
      <VerticalSpace space="medium" />
      <MiddleAlign style={"height: auto;"}>{preview}</MiddleAlign>
      <VerticalSpace space="large" />
      {selectedNodes.length > 1 && !showExportWarning ? (
        <>
          <Banner icon={<IconInfo32 />}>
            Too many or large nodes may freeze the UI during export.
          </Banner>
          <VerticalSpace space="small" />
        </>
      ) : null}
      {showExportWarning ? (
        <>
          <Banner icon={<IconWarning32 />} variant="warning">
            Exporting may freeze the UI. Try selecting fewer or smaller nodes.
          </Banner>
          <VerticalSpace space="small" />
        </>
      ) : null}
      {selectedNodes.length <= 1 ? (
        <>
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
        </>
      ) : null}
      <Button
        fullWidth
        secondary
        loading={inProgress}
        disabled={isExportButtonDisabled()}
        onClick={() => clickDownloadZip()}
      >
        {selectedNodes.length <= 1
          ? "Export"
          : `Export ${selectedNodes.length} images`}
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
        <div className={styles.quality}>
          <RangeSlider
            minimum={10}
            maximum={100}
            increment={10}
            onNumericValueInput={(value) =>
              value ? setExportQuality(value) : null
            }
            value={exportQuality.toString()}
          />
          <TextboxNumeric
            integer
            variant="border"
            minimum={10}
            maximum={100}
            onNumericValueInput={(value) =>
              value ? setExportQuality(value) : null
            }
            suffix="%"
            value={`${exportQuality}%`}
          />
        </div>
        <VerticalSpace space="small" />
        <Inline space="small">
          <ScaleExportToggle
            checked={exportScales.get(1) ?? false}
            scale={1}
            setScale={setExportScale}
          />
          <ScaleExportToggle
            checked={exportScales.get(1.5) ?? false}
            scale={1.5}
            setScale={setExportScale}
          />
          <ScaleExportToggle
            checked={exportScales.get(2) ?? false}
            scale={2}
            setScale={setExportScale}
          />
          <ScaleExportToggle
            checked={exportScales.get(3) ?? false}
            scale={3}
            setScale={setExportScale}
          />
          <ScaleExportToggle
            checked={exportScales.get(4) ?? false}
            scale={4}
            setScale={setExportScale}
          />
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

type ScaleExportToggleProps = {
  checked: boolean;
  scale: RenderedImageScale;
  setScale: (scale: RenderedImageScale, checked: boolean) => void;
};

function ScaleExportToggle({
  checked,
  scale,
  setScale,
}: ScaleExportToggleProps) {
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
