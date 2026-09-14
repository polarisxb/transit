import { renderSVG } from 'uqr'

export function qrSvg(text: string, size = 96): string {
  return renderSVG(text, {
    border: 1,
    pixelSize: 4,
    whiteColor: '#ffffff',
    blackColor: '#1d1d1f',
  }).replace(/width="[^"]+"/, `width="${size}"`).replace(/height="[^"]+"/, `height="${size}"`)
}
