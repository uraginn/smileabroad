export const SHARED_VIEW_PRIMARY = "#0A1626";
export const SHARED_VIEW_ACCENT = "#9DD6FF";

function hexToRgb(value?: string) {
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) return undefined;
  return {
    red: Number.parseInt(value.slice(1, 3), 16) / 255,
    green: Number.parseInt(value.slice(3, 5), 16) / 255,
    blue: Number.parseInt(value.slice(5, 7), 16) / 255,
  };
}

export function isGoldLikeColor(value?: string) {
  const rgb = hexToRgb(value);
  if (!rgb) return false;
  const max = Math.max(rgb.red, rgb.green, rgb.blue);
  const min = Math.min(rgb.red, rgb.green, rgb.blue);
  const delta = max - min;
  if (delta === 0) return false;

  let hue = 0;
  if (max === rgb.red) hue = 60 * (((rgb.green - rgb.blue) / delta) % 6);
  else if (max === rgb.green) hue = 60 * ((rgb.blue - rgb.red) / delta + 2);
  else hue = 60 * ((rgb.red - rgb.green) / delta + 4);
  if (hue < 0) hue += 360;

  const lightness = (max + min) / 2;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  return hue >= 25 && hue <= 55 && saturation >= 0.2 && lightness >= 0.25 && lightness <= 0.85;
}

function sharedColor(value: string | undefined, fallback: string) {
  return hexToRgb(value) && !isGoldLikeColor(value) ? value!.toUpperCase() : fallback;
}

export function resolveSharedViewColors(primary?: string, accent?: string) {
  return {
    primary: sharedColor(primary, SHARED_VIEW_PRIMARY),
    accent: sharedColor(accent, SHARED_VIEW_ACCENT),
  };
}
