import {
  IconButton,
  IconMinus24,
  IconWarning16,
  TextboxAutocomplete,
  TextboxAutocompleteOption,
} from "@create-figma-plugin/ui";
import { h } from "preact";
import { useState } from "preact/hooks";
import { Settings } from "./types";
import { EventHandler } from "@create-figma-plugin/ui/lib/types/event-handler";
import styles from "./styles.css";

interface ScaleExportProps {
  defaultValue: number;
  structure: Settings["exportStructure"];
  onClickRemove: EventHandler.onClick<HTMLButtonElement>;
  onValueChange: (v: number) => boolean;
}

const ScaleToAndroidMapping = new Map<string, string>([
  ["1x", "mdpi"],
  ["1.5x", "hdpi"],
  ["2x", "xhdpi"],
  ["3x", "xxhdpi"],
  ["4x", "xxxhdpi"],
]);

const ScaleToIosMapping = new Map<string, string>([
  ["1x", "@1x"],
  ["2x", "@2x"],
  ["3x", "@3x"],
]);

const InvertedMappingValues = new Map(
  ScaleToAndroidMapping.entries()
    .toArray()
    .concat(...ScaleToIosMapping.entries())
    .map(([key, value]) => [value, key]),
);

export const ScaleExport = ({ defaultValue, structure, onClickRemove, onValueChange }: ScaleExportProps) => {
  const [draftValue, setDraftValue] = useState<string>(`${defaultValue}x`);
  const [value, setValue] = useState<string>(`${defaultValue}x`);

  const validateAndSubmitInput = () => {
    const numericValue = (InvertedMappingValues.get(draftValue) ?? draftValue).toLowerCase().replace("x", "");
    const parsedValue = parseFloat(numericValue);

    if (!isNaN(parsedValue) && parsedValue > 0) {
      const roundedValue = Number(parsedValue.toFixed(2));

      if (!onValueChange(roundedValue)) {
        setDraftValue(value);
        return;
      }

      const newValue = `${roundedValue}x`;
      setDraftValue(newValue);
      setValue(newValue);
    } else {
      // reset to working value
      setDraftValue(value);
    }
  };

  let mappedDraftValue: string;
  switch (structure) {
    case "android":
      mappedDraftValue = ScaleToAndroidMapping.get(draftValue) ?? draftValue;
      break;
    case "ios":
      mappedDraftValue = ScaleToIosMapping.get(draftValue) ?? draftValue;
      break;
    case "web":
    case "flat":
      mappedDraftValue = draftValue;
      break;
  }

  let isUnsupported: boolean;
  switch (structure) {
    case "android":
      isUnsupported = !ScaleToAndroidMapping.has(value);
      break;
    case "ios":
      isUnsupported = !ScaleToIosMapping.has(value);
      break;
    case "web":
    case "flat":
      isUnsupported = false;
      break;
  }

  const options: TextboxAutocompleteOption[] = [];
  switch (structure) {
    case "android":
      options.push({ header: "Android" });
      options.push(...ScaleToAndroidMapping.values().map((value) => ({ value })));
      break;
    case "ios":
      options.push({ header: "iOS" });
      options.push(...ScaleToIosMapping.values().map((value) => ({ value })));
      break;
    case "web":
    case "flat":
      options.push(...ScaleToAndroidMapping.keys().map((value) => ({ value })));
      break;
  }

  let platformName = "";
  switch (structure) {
    case "android":
      platformName = "Android";
      break;
    case "ios":
      platformName = "iOS";
      break;
  }

  return (
    <div className={styles.column}>
      <div style="flex-grow: 1;">
        <TextboxAutocomplete
          onValueInput={(v) => setDraftValue(v)}
          options={options}
          value={mappedDraftValue}
          icon={isUnsupported ? <IconWarning16 /> : undefined}
          onFocusOut={validateAndSubmitInput}
          onKeyUp={(event) => {
            if (event.key === "Enter") {
              validateAndSubmitInput();
            }
          }}
          title={isUnsupported ? `Scale not supported on ${platformName}; will be ignored` : undefined}
        />
      </div>
      <IconButton onClick={onClickRemove}>
        <IconMinus24 />
      </IconButton>
    </div>
  );
};
