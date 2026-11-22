export interface Colorizer {
  bold: (s: string) => string;
  dim: (s: string) => string;
  red: (s: string) => string;
  green: (s: string) => string;
  yellow: (s: string) => string;
  cyan: (s: string) => string;
  magenta: (s: string) => string;
  blue: (s: string) => string;
}

const identity = (s: string): string => s;

export function createColorizer(enabled: boolean): Colorizer {
  if (!enabled) {
    return {
      bold: identity,
      dim: identity,
      red: identity,
      green: identity,
      yellow: identity,
      cyan: identity,
      magenta: identity,
      blue: identity,
    };
  }

  const wrap = (open: number, close: number) => (s: string) =>
    `\x1b[${open}m${s}\x1b[${close}m`;

  return {
    bold: wrap(1, 22),
    dim: wrap(2, 22),
    red: wrap(31, 39),
    green: wrap(32, 39),
    yellow: wrap(33, 39),
    cyan: wrap(36, 39),
    magenta: wrap(35, 39),
    blue: wrap(34, 39),
  };
}
