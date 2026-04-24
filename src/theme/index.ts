import { createTheme, MantineColorsTuple } from '@mantine/core';

// HUD cyan 的 10 階 Mantine colors tuple
const hudCyan: MantineColorsTuple = [
  '#e6ffff',
  '#ccffff',
  '#99ffff',
  '#66ffff',
  '#33ffff',
  '#00ffff',
  '#00cccc',
  '#009999',
  '#006666',
  '#003333',
];

export const theme = createTheme({
  primaryColor: 'hudCyan',
  primaryShade: 5,
  colors: {
    hudCyan,
  },
  fontFamily:
    '"Noto Sans TC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace: '"JetBrains Mono", "SF Mono", Consolas, monospace',
  headings: {
    fontFamily: '"Orbitron", "Noto Sans TC", sans-serif',
  },
  defaultRadius: 0, // HUD 風格偏向直角
  components: {
    Button: {
      defaultProps: {
        radius: 0,
      },
    },
    Input: {
      defaultProps: {
        radius: 0,
      },
    },
  },
});
