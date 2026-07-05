export const theme = {
  colors: {
    background: '#fcf8f8',
    surface: '#f0eded',
    surfaceDim: '#dcd9d9',
    primary: '#181c21',
    secondary: '#545f73',
    income: '#8FA38D',
    spending: '#D99771',
    text: '#1c1b1c',
    textSecondary: '#45474a',
    outline: '#75777b',
    white: '#ffffff',
    error: '#ba1a1a',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    page: 24,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
  },
  typography: {
    headline: 'Manrope',
    body: 'DM Sans',
  }
};

export type Theme = typeof theme;
