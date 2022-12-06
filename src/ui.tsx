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
} from "@create-figma-plugin/ui";
import { h } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { emit, on } from "@create-figma-plugin/utilities";
import {
  fileNameAndroid,
  fileNameWeb,
  RenderedImage,
  RenderedImageScale,
  RenderRequestHandler,
  RenderResultHandler,
  SaveSettings,
  SelectionChanged,
  Settings,
} from "./types";
import JSZip from "jszip";
import styles from "./styles.css";

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
    if (fileName !== undefined) {
      zip.file(`${fileName}.webp`, data, { base64: true });
    }
  });
  return zip;
}

async function downloadZip(zip: JSZip, name: string) {
  const base64Zip = await zip.generateAsync({ type: "base64" });
  const link = document.createElement("a");
  link.download = name;
  link.href = "data:application/zip;base64," + base64Zip;
  link.click();
}

function Preview(settings: Settings) {
  const [useAndroidExport, setUseAndroidExport] = useState(
    settings.useAndroidExport
  );
  useEffect(() => {
    emit<SaveSettings>("SAVE_SETTINGS", { useAndroidExport: useAndroidExport });
  }, [useAndroidExport]);

  const [fileName, setFileName] = useState("");
  const [previewImage, setPreviewImage] = useState<Uint8Array | undefined>(
    undefined
  );
  const [inProgress, setInProgress] = useState(false);

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
              if (b64WebP.length == rimages.length) {
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
    emit<RenderRequestHandler>("RENDER_REQUEST");
  }, []);

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
      <VerticalSpace space="medium" />
      <Button
        fullWidth
        secondary
        loading={inProgress}
        disabled={fileName.length == 0 || inProgress}
        onClick={() => clickDownloadZip()}
      >
        Export
      </Button>
      <VerticalSpace space="small" />
      <Checkbox
        onChange={(event) => setUseAndroidExport(event.currentTarget.checked)}
        value={useAndroidExport}
      >
        <Text>Export for Android</Text>
      </Checkbox>
    </Container>
  );
}

export default render(Preview);
