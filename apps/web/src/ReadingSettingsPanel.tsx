import { useId, type CSSProperties, type ReactNode, type Ref } from "react";
import { InfoTip } from "./InfoTip";
import { COLOURS, DEFAULT_READING_SETTINGS, FONTS, HIGHLIGHTS, TEXT_SIZES, type ReadingSettings } from "./readingSettings";

interface Option<T extends string> {
  value: T;
  /** Visible content of the pill; defaults to `name`. */
  content?: ReactNode;
  /** Accessible name, also shown when there's no `content`. */
  name: string;
  style?: CSSProperties;
}

function PillGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  hint,
}: {
  legend: string;
  name: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** A short explanation behind an ⓘ button next to the legend, and read out with the options. */
  hint?: string;
}) {
  const hintId = useId();
  return (
    <fieldset className="setting" aria-describedby={hint ? hintId : undefined}>
      <legend>
        {legend}
        {hint && <InfoTip id={hintId} label={`About ${legend.toLowerCase()}`} text={hint} />}
      </legend>
      <div className="pills">
        {options.map((option) => (
          <label key={option.value} className={option.value === value ? "pill selected" : "pill"} style={option.style}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              aria-label={option.name}
              className="visually-hidden"
            />
            {option.content ?? option.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const SIZE_NAMES: Record<(typeof TEXT_SIZES)[number], string> = {
  standard: "Standard",
  large: "Large",
  "x-large": "Extra large",
  huge: "Huge",
};
const FONT_NAMES: Record<(typeof FONTS)[number], string> = { default: "Default", hyperlegible: "Hyperlegible" };
const HIGHLIGHT_NAMES: Record<(typeof HIGHLIGHTS)[number], string> = {
  marker: "Marker",
  outline: "Outline",
  inverted: "Inverted",
};
const COLOUR_NAMES: Record<(typeof COLOURS)[number], string> = {
  paper: "Paper",
  contrast: "High contrast",
  blue: "Blue tint",
};

export function ReadingSettingsPanel({
  ref,
  id,
  settings,
  onChange,
}: {
  ref?: Ref<HTMLDivElement>;
  id: string;
  settings: ReadingSettings;
  onChange: (change: Partial<ReadingSettings>) => void;
}) {
  return (
    <div ref={ref} id={id} className="card settings-popover" role="group" aria-label="Reading settings">
      {/* A live preview, since there may be no text on screen yet. Uses the reader's own styles. */}
      <div
        className="reader settings-preview"
        aria-hidden="true"
        data-size={settings.size}
        data-font={settings.font}
        data-highlight={settings.highlight}
        data-colours={settings.colours}
      >
        <p className="reading">
          <span className="word">Each</span> <span className="word active">word</span>{" "}
          <span className="word">lights</span> <span className="word">up.</span>{" "}
          <span className={settings.sentenceFocus ? "word dimmed" : "word"}>Others</span>{" "}
          <span className={settings.sentenceFocus ? "word dimmed" : "word"}>fade.</span>
        </p>
      </div>
      {/* Ordered by how often readers need them: size and contrast first, finer adjustments last. */}
      <div className="reading-settings">
        <PillGroup
          legend="Text size"
          name="size"
          value={settings.size}
          onChange={(size) => onChange({ size })}
          options={TEXT_SIZES.map((value, i) => ({
            value,
            name: SIZE_NAMES[value],
            content: <span style={{ fontSize: `${0.8125 + i * 0.1875}rem` }}>A</span>,
          }))}
        />
        <PillGroup
          legend="Colours"
          name="colours"
          value={settings.colours}
          onChange={(colours) => onChange({ colours })}
          options={COLOURS.map((value) => ({
            value,
            name: COLOUR_NAMES[value],
            content: (
              <>
                <span className={`swatch swatch-${value}`} aria-hidden="true" />
                {COLOUR_NAMES[value]}
              </>
            ),
          }))}
        />
        <PillGroup
          legend="Highlight"
          name="highlight"
          value={settings.highlight}
          onChange={(highlight) => onChange({ highlight })}
          options={HIGHLIGHTS.map((value) => ({
            value,
            name: HIGHLIGHT_NAMES[value],
            content: <span className={`sample sample-${value}`}>{HIGHLIGHT_NAMES[value]}</span>,
          }))}
        />
        <PillGroup
          legend="Font"
          name="font"
          value={settings.font}
          onChange={(font) => onChange({ font })}
          options={FONTS.map((value) => ({ value, name: FONT_NAMES[value], style: { fontFamily: `var(--font-${value})` } }))}
          hint="Hyperlegible makes letters that look alike, like I, l and 1, easier to tell apart."
        />
        <PillGroup
          legend="Sentence focus"
          name="sentence-focus"
          value={settings.sentenceFocus ? "on" : "off"}
          onChange={(value) => onChange({ sentenceFocus: value === "on" })}
          options={[
            { value: "off", name: "Off" },
            { value: "on", name: "On" },
          ]}
          hint="Fades everything but the sentence being read."
        />
      </div>
      <div className="settings-footer">
        <button type="button" className="button secondary small" onClick={() => onChange(DEFAULT_READING_SETTINGS)}>
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
