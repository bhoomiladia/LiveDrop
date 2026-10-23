import { studioTheme, type AgStudioThemeParams } from "ag-studio";

// AG Studio dressed in the app's look (globals.css): Inter Tight, cobalt, flat cards on the canvas grey.
// Red stays out of the chart palette: it's reserved for LIVE.

const FONT = '"Inter Tight", "Inter", "Helvetica Neue", ui-sans-serif, system-ui, sans-serif';
const INK = "#0c0e13";
const MUTED = "#686c75";
const LINE = "#e4e8ef";
const CANVAS = "#f6f8fc";
const BRAND = "#2659d9";
const PALETTE = ["#2659d9", "#f0a429", "#17a398", "#7b5cf0", "#06174a", "#8fb3f5", "#c98a1b", "#9aa3b2"];

const palette: Partial<AgStudioThemeParams> = Object.fromEntries(
  PALETTE.flatMap((color, i) => [
    [`chartPaletteFills${i + 1}Color`, color],
    [`chartPaletteStrokes${i + 1}Color`, color],
  ]),
);

const base: Partial<AgStudioThemeParams> = {
  fontFamily: FONT,
  fontSize: 13,
  textColor: INK,
  subtleTextColor: MUTED,
  borderColor: LINE,
  accentColor: BRAND,
  backgroundColor: "#ffffff",
  studioWrapperBorder: false,
  studioWrapperBackgroundColor: CANVAS,
  studioCanvasBackgroundColor: CANVAS,
  studioCanvasFontFamily: FONT,
  studioCanvasPadding: 16,
  studioWidgetBackgroundColor: "#ffffff",
  studioWidgetBorder: { width: 1, color: LINE },
  studioWidgetBorderRadius: 12,
  studioWidgetPadding: 14,
  studioWidgetTitleFontFamily: FONT,
  studioWidgetTitleFontSize: 14,
  studioWidgetTitleFontWeight: 600,
  studioWidgetTitleTextColor: INK,
  studioWidgetSubtitleFontFamily: FONT,
  studioWidgetCaptionFontFamily: FONT,
  studioValueWidgetFontSize: 30,
  studioPanelHeaderFontFamily: FONT,
  studioPanelHeaderFontWeight: 600,
  studioAiPanelWidth: 380,
  studioToggleButtonActiveBackgroundColor: BRAND,
  studioToggleButtonActiveBorderColor: BRAND,
  studioToggleButtonActiveColor: BRAND,
  chartFontFamily: FONT,
  chartTextColor: INK,
  chartSubtleTextColor: MUTED,
  chartGridLineColor: "#eef1f6",
  chartAxisLineColor: LINE,
  gridFontFamily: FONT,
  gridFontSize: 13,
  gridHeaderFontWeight: 600,
  gridHeaderTextColor: MUTED,
  gridHeaderBackgroundColor: "#fafbfd",
  gridRowHeight: 38,
  gridRowBorder: { width: 1, color: "#eef1f6" },
  gridWrapperBorder: false,
  ...palette,
};

export const controlTheme = studioTheme.withParams(base);
// While the Show Producer panel is open the canvas is technically in edit mode: hide the layout grid.
export const producerTheme = studioTheme.withParams({ ...base, studioCanvasGridLineColor: "transparent" });
