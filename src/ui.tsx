import {
  Banner,
  Bold,
  Button,
  Container,
  Divider,
  Dropdown,
  DropdownOption,
  IconButton,
  IconFrame24,
  IconInfoSmall24,
  IconPlus24,
  IconWarningSmall24,
  MiddleAlign,
  RangeSlider,
  render,
  SegmentedControl,
  SegmentedControlOption,
  Text,
  Textbox,
  TextboxNumeric,
  VerticalSpace,
} from "@create-figma-plugin/ui";
import { ComponentChildren, h } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { emit, on } from "@create-figma-plugin/utilities";
import {
  RenderedImage,
  RenderedImageScale,
  SelectedNode,
  Settings,
  SettingsNamingConvention,
  WindowSize,
} from "./types";
import JSZip from "jszip";
import styles from "./styles.css";
import donateLogo from "./ko-fi-logo.png";
import { RenderRequestHandler, RenderResultHandler, Resize, SaveSettings, SelectionChanged } from "./events";
import { convertFileName, fileNameAndroid, fileNameFlat, fileNameIos, fileNameWeb } from "./utils";
import { EventHandler } from "@create-figma-plugin/ui/lib/types/event-handler";
import { IconFolder16 } from "./icons/folder";
import { IconFolders16 } from "./icons/folders";
import { IconAndroid16 } from "./icons/android";
import { ResizeHandle } from "./resizeHandle";
import { IconIos16 } from "./icons/ios";
import { ScaleExport } from "./scaleExport";

const MaxPixelSize = 2e6;

function zipFiles(
  zip: JSZip,
  webp: { data: Blob; scale: RenderedImageScale }[],
  baseName: string,
  exportStructure: Settings["exportStructure"],
  replacement: string,
): JSZip {
  webp.forEach(({ data, scale }) => {
    let fileName: string | undefined;
    switch (exportStructure) {
      case "android":
        fileName = fileNameAndroid(scale, baseName);
        break;
      case "ios":
        fileName = fileNameIos(scale, baseName);
        break;
      case "web":
        fileName = fileNameWeb(scale, baseName, replacement);
        break;
      case "flat":
        fileName = fileNameFlat(scale, baseName, replacement);
        break;
    }
    if (fileName) zip.file(`${fileName}.webp`, data);
  });
  // Currently xcode won't include .webp files in the assets folder
  // if (exportStructure === "ios") {
  //   zip.file(
  //     `${baseName}.imageset/Contents.json`,
  //     iosContentJson(
  //       baseName,
  //       webp.map(({ scale }) => ({ scale })),
  //     ),
  //   );
  // }
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
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const blob = new Blob([new Uint8Array(data)], { type: "image/png" });
  const image = new Image();

  image.src = URL.createObjectURL(blob);
  return await new Promise<Blob>((resolve, reject) => {
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx?.drawImage(image, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Couldn't create image"));
        },
        "image/webp",
        quality,
      );
    };
  });
}

function Preview(settings: Settings) {
  const [exportStructure, setExportStructure] = useState<Settings["exportStructure"]>(settings.exportStructure);
  const [exportScales, setExportScales] = useState(new Set(settings.selectedExportScalesV2));
  const [exportQuality, setExportQuality] = useState<number>(settings.exportQuality);
  const [namingConvention, setNamingConvention] = useState<SettingsNamingConvention>(settings.namingConvention);
  const [windowSize, setWindowSize] = useState<WindowSize>(settings.pluginWindowSize);

  useEffect(() => {
    emit<SaveSettings>("SAVE_SETTINGS", {
      pluginWindowSize: windowSize,
      exportStructure: exportStructure,
      exportQuality: exportQuality,
      selectedExportScalesV2: Array.from(exportScales),
      namingConvention: namingConvention,
    });
  }, [exportStructure, windowSize, exportScales, exportQuality, namingConvention]);

  const [showExportWarning, setShowExportWarning] = useState(false);
  const [originalFileName, setOriginalFileName] = useState("");
  const [fileName, setFileName] = useState("");
  const [selectedNodes, setSelectedNodes] = useState<SelectedNode[]>([]);
  const [previewImages, setPreviewImages] = useState<Uint8Array[]>([]);
  const [inProgress, setInProgress] = useState(false);

  function handleResize(size: WindowSize) {
    setWindowSize(size);
    emit<Resize>("RESIZE", size);
  }

  function isExportButtonDisabled(): boolean {
    let anyChecked = false;
    exportScales.forEach((checked) => {
      if (checked) {
        anyChecked = true;
      }
    });
    return setSelectedNodes.length == 0 || fileName.length == 0 || inProgress || !anyChecked;
  }

  useEffect(() => {
    setFileName(convertFileName(originalFileName, namingConvention));
  }, [namingConvention]);

  useEffect(() => {
    const deleteSelectionChangedHandler = on<SelectionChanged>(
      "SELECTION_CHANGED",
      function (totalPixelSize: number, nodes: SelectedNode[], previewImages: Uint8Array[]) {
        console.log("Selection changed", totalPixelSize);
        setShowExportWarning(totalPixelSize * exportScales.size > MaxPixelSize);
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
        void (async () => {
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
              const name = nodes.length == 1 ? fileName : convertFileName(node.name, namingConvention);

              zipFiles(zip, webps, name, exportStructure, namingConvention.replacement);
            }

            setInProgress(false);

            await downloadZip(
              zip,
              nodes.length == 1 ? fileName : `export_${new Date().toISOString().replace(".", "-")}`,
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
          const blob = new Blob([new Uint8Array(image)], { type: "image/png" });
          return (
            <img key={index} id={"img-preview"} alt={""} src={URL.createObjectURL(blob)} className={styles.preview} />
          );
        })}
      </div>
    );
  } else {
    preview = (
      <div class={styles.preview_no_selection}>
        <IconFrame24 />
        <div>Select node(s)</div>
      </div>
    );
  }

  const transformOptions: DropdownOption[] = [
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

  const folderStructureOptions: SegmentedControlOption[] = [
    {
      children: <IconFolder16 />,
      value: "flat",
    },
    {
      children: <IconFolders16 />,
      value: "web",
    },
    {
      children: <IconAndroid16 />,
      value: "android",
    },
    {
      children: <IconIos16 />,
      value: "ios",
    },
  ];

  return (
    <div className={styles.main}>
      <Container space="medium">
        <VerticalSpace space="medium" />
        <MiddleAlign style={"height: auto;"}>{preview}</MiddleAlign>
        <VerticalSpace space="large" />
        {selectedNodes.length > 4 && !showExportWarning ? (
          <>
            <Banner icon={<IconInfoSmall24 />}>Too many or large nodes may freeze the UI during export.</Banner>
            <VerticalSpace space="small" />
          </>
        ) : null}
        {showExportWarning ? (
          <>
            <Banner icon={<IconWarningSmall24 />} variant="warning">
              Exporting may freeze the UI. Try selecting fewer or smaller nodes.
            </Banner>
            <VerticalSpace space="small" />
          </>
        ) : null}
        {selectedNodes.length <= 1 ? (
          <>
            <Textbox
              placeholder="Enter filename"
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
        <Button fullWidth loading={inProgress} disabled={isExportButtonDisabled()} onClick={() => clickDownloadZip()}>
          {selectedNodes.length <= 1 ? "Export" : `Export ${selectedNodes.length} images`}
        </Button>
        <VerticalSpace space="large" />
        <Section heading="Quality">
          <div className={styles.quality}>
            <RangeSlider
              minimum={10}
              maximum={100}
              increment={10}
              onNumericValueInput={(value) => (value ? setExportQuality(value) : null)}
              value={exportQuality.toString()}
            />
            <TextboxNumeric
              integer
              minimum={10}
              maximum={100}
              onNumericValueInput={(value) => (value ? setExportQuality(value) : null)}
              suffix="%"
              value={`${exportQuality}%`}
            />
          </div>
        </Section>
        <VerticalSpace space="medium" />
      </Container>
      <Divider />
      <Container space="medium">
        <Section heading="Folder Structure">
          <div className={styles.structure}>
            <SegmentedControl
              onValueChange={(value) => setExportStructure(value as Settings["exportStructure"])}
              value={exportStructure}
              options={folderStructureOptions}
            />
          </div>
        </Section>
        <Section
          heading="Resolution"
          icon={<IconPlus24 />}
          onClick={() =>
            setExportScales((prev) => {
              const maxScale = Math.max(...Array.from(prev), 0);
              return new Set([...prev, maxScale + 1]);
            })
          }
        >
          <div className={styles.row}>
            {Array.from(exportScales).map((scale, index) => (
              <ScaleExport
                key={`${index}_${scale}`}
                defaultValue={scale}
                structure={exportStructure}
                onClickRemove={() => {
                  setExportScales((prev) => {
                    const newScales = new Set(prev);
                    newScales.delete(scale);
                    return newScales;
                  });
                }}
                onValueChange={(v) => {
                  if (exportScales.has(v)) return false;
                  setExportScales((prev) => {
                    const newScales = Array.from(prev);
                    newScales[index] = v;
                    return new Set(newScales);
                  });
                  return true;
                }}
              />
            ))}
          </div>
        </Section>
        <VerticalSpace space="medium" />
      </Container>
      <Divider />
      <Container space="medium">
        <Section heading="Naming">
          <div className={styles.naming}>
            <Dropdown
              onChange={(value) =>
                setNamingConvention((v) => {
                  return {
                    transform: value.currentTarget.value as SettingsNamingConvention["transform"],
                    replacement: v.replacement,
                  };
                })
              }
              options={transformOptions}
              value={namingConvention.transform}
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
              placeholder="Divider"
            />
          </div>
        </Section>
        <VerticalSpace space="medium" />
        <Banner icon={<IconInfoSmall24 />}>
          We export multiple images bundled as a ZIP. It’s a technical requirement we can’t avoid.
        </Banner>
        <VerticalSpace space="extraLarge" />
        {DonateLogo()}
        <VerticalSpace space="medium" />
      </Container>
      <ResizeHandle onResize={handleResize} />
    </div>
  );
}

interface SectionProps {
  heading: string;
  icon?: ComponentChildren;
  onClick?: EventHandler.onClick<HTMLButtonElement>;
  children: ComponentChildren;
}

const Section = ({ heading, icon, onClick, children }: SectionProps) => {
  return (
    <div>
      <VerticalSpace space="medium" />
      <div className={styles.column}>
        <Text>
          <Bold>{heading}</Bold>
        </Text>
        {icon && onClick && <IconButton onClick={onClick}>{icon}</IconButton>}
      </div>
      <VerticalSpace space="medium" />
      {children}
    </div>
  );
};

function DonateLogo() {
  return (
    <a id={styles.donate} href="https://ko-fi.com/webpgen" target="_blank" rel="noreferrer">
      <img src={donateLogo} alt="Donate" />
      Donate
    </a>
  );
}

export default render(Preview);
