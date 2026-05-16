export function getDominantColor(imgElement: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'rgb(24, 24, 27)'; // fallback card color

  canvas.width = imgElement.naturalWidth || imgElement.width || 300;
  canvas.height = imgElement.naturalHeight || imgElement.height || 300;

  try {
    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    
    let r = 0, g = 0, b = 0;
    let count = 0;
    const step = 4 * 10; // check every 10th pixel for performance
    
    for (let i = 0; i < imageData.length; i += step) {
      if (imageData[i + 3] > 0) { // ignore transparent
        r += imageData[i];
        g += imageData[i + 1];
        b += imageData[i + 2];
        count++;
      }
    }
    
    if (count === 0) return 'rgb(24, 24, 27)';
    
    r = Math.floor(r / count);
    g = Math.floor(g / count);
    b = Math.floor(b / count);
    
    return `rgb(${r}, ${g}, ${b})`;
  } catch (e) {
    return 'rgb(24, 24, 27)'; // CORS or other error fallback
  }
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
