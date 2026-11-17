import {
  createTheme,
  Modal,
  Popover,
  Select,
  Tooltip,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from "@mantine/core";

const cine: MantineColorsTuple = [
  "#ffebea",
  "#fad4d2",
  "#f1a6a2",
  "#e9746d",
  "#e34b42",
  "#dd3026",
  "#cc120b",
  "#a50e09",
  "#8e0a06",
  "#730704",
];

const cineDark: MantineColorsTuple = [
  "#f5f5f6",
  "#d2d2d6",
  "#a8a9b1",
  "#686871",
  "#292a31",
  "#22232b",
  "#1a1b21",
  "#121318",
  "#0d0d10",
  "#080808",
];

export const cineTheme = createTheme({
  primaryColor: "cine",
  primaryShade: { light: 6, dark: 6 },
  colors: {
    cine,
    dark: cineDark,
  },
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headings: {
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  defaultRadius: "md",
  components: {
    Modal: Modal.extend({
      defaultProps: { zIndex: 1200 },
    }),
    Popover: Popover.extend({
      defaultProps: { zIndex: 1300 },
    }),
    Select: Select.extend({
      defaultProps: { comboboxProps: { zIndex: 1300 } },
    }),
    Tooltip: Tooltip.extend({
      defaultProps: { zIndex: 1300 },
    }),
  },
});

export const cineCssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    "--mantine-z-index-modal": "1200",
    "--mantine-z-index-overlay": "1250",
    "--mantine-z-index-popover": "1300",
  },
  light: {},
  dark: {
    "--mantine-color-body": "#080808",
    "--mantine-color-text": "#f5f5f6",
    "--mantine-color-dimmed": "#a8a9b1",
    "--mantine-color-placeholder": "#686871",
    "--mantine-color-default": "#1a1b21",
    "--mantine-color-default-hover": "#22232b",
    "--mantine-color-default-border": "#292a31",
  },
});
