const FALLBACK = 'rgb(24, 24, 27)';

/* Sampling at 24x24 rather than the image's natural size. A 600px cover is
 * 360k pixels, so the old full-resolution readback allocated ~1.4MB of
 * ImageData per call and then threw it away — on a page that calls this on
 * every artwork load. Downscaling is done by the GPU inside drawImage and gives
 * a better answer anyway, because it pre-averages noise. */
const SAMPLE_SIZE = 24;
const HUE_BUCKETS = 18;

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rf) h = ((gf - bf) / d + (gf < bf ? 6 : 0)) / 6;
  else if (max === gf) h = ((bf - rf) / d + 2) / 6;
  else h = ((rf - gf) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

/**
 * Picks the most characteristic colour in an image.
 *
 * This used to average every pixel, which is why it always came back a muddy
 * grey-brown: averaging opposite hues cancels them out, so the more colourful
 * the artwork the duller the result. Instead, pixels vote for a hue bucket with
 * a weight of saturation squared, near-black and near-white pixels abstain, and
 * the winning bucket's average hue is returned at a fixed saturation and
 * lightness. That keeps the result legible against a near-black UI regardless
 * of whether the cover is a dark photo or a bright illustration.
 *
 * Requires a same-origin (or CORS-clean) image, otherwise the canvas is tainted
 * and getImageData throws — hence the try/catch and the neutral fallback.
 */
export function getDominantColor(imgElement: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return FALLBACK;

  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;

  try {
    ctx.drawImage(imgElement, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const data = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;

    const weights = new Float64Array(HUE_BUCKETS);
    const hueSin = new Float64Array(HUE_BUCKETS);
    const hueCos = new Float64Array(HUE_BUCKETS);

    let neutralL = 0;
    let neutralCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);

      // Ignore pixels with no usable chroma — letterboxing, paper white, black
      // vinyl — but remember their lightness for the all-greyscale case.
      if (s < 0.18 || l < 0.12 || l > 0.92) {
        neutralL += l;
        neutralCount++;
        continue;
      }

      const bucket = Math.min(HUE_BUCKETS - 1, Math.floor(h * HUE_BUCKETS));
      const weight = s * s;
      weights[bucket] += weight;
      // Hue is circular, so accumulate as a vector and average by angle.
      const angle = h * Math.PI * 2;
      hueSin[bucket] += Math.sin(angle) * weight;
      hueCos[bucket] += Math.cos(angle) * weight;
    }

    let best = -1;
    let bestWeight = 0;
    for (let b = 0; b < HUE_BUCKETS; b++) {
      if (weights[b] > bestWeight) { bestWeight = weights[b]; best = b; }
    }

    // Genuinely monochrome artwork: return a neutral at the image's own
    // lightness rather than inventing a hue.
    if (best === -1) {
      if (!neutralCount) return FALLBACK;
      const [r, g, bl] = hslToRgb(0, 0, Math.min(0.62, Math.max(0.3, neutralL / neutralCount)));
      return `rgb(${r}, ${g}, ${bl})`;
    }

    let hue = Math.atan2(hueSin[best], hueCos[best]) / (Math.PI * 2);
    if (hue < 0) hue += 1;

    const [r, g, b] = hslToRgb(hue, 0.62, 0.55);
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return FALLBACK; // tainted canvas or decode failure
  }
}

/**
 * Adds an alpha channel to one of the `rgb(...)` strings produced above.
 * Hex-style suffixes (`${color}33`) cannot be used on an `rgb()` value, and
 * silently produce an invalid colour that the browser drops.
 */
export function withAlpha(rgbString: string, alpha: number): string {
  const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return rgbString;
  return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
}

export function getContrastColor(rgbString: string): string {
  const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return '#ffffff';

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);

  // YIQ equation from http://24ways.org/2010/calculating-color-contrast
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
}
