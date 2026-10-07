# qris-converter

Parse, validate, and convert Indonesian **QRIS** codes — including static → dynamic conversion — and render QR images. Works in any modern JavaScript runtime: Node.js ≥ 18, Bun, Deno, browsers, and edge/worker runtimes.

Zero dependencies. Fully typed. ESM + CJS.

## Features

- **QRIS parser** — `getQRISInfo()` accepts a QRIS string, a PNG/JPEG image buffer, or raw RGBA pixels; returns merchant name, city, category, issuer, NMID, amount, tips, CRC validity, and the full TLV tree.
- **Static → dynamic converter** — `convertQRIS()` injects an amount and an optional service fee (fixed or percentage), flips the point of initiation to dynamic, and recomputes the CRC16 checksum.
- **Validation** — `validateQRIS()` checks structure and CRC integrity.
- **Image support** — decode QR codes from images (`decodeQRImage`) and render QR images as PNG bytes, data URLs, or SVG (`renderQRIS`).
- **Spec-correct CRC16** — CRC-16/CCITT-FALSE computed over UTF-8 bytes, per the EMVCo QR specification.

## Install

```bash
npm install github:arilukmanp/qris-converter
# or
pnpm add github:arilukmanp/qris-converter
# or
yarn add github:arilukmanp/qris-converter
# or
bun add github:arilukmanp/qris-converter
```

> npm registry publishing is planned; until then, install from GitHub. No build step required.

## Quickstart

### Parse a QRIS string

```ts
import { getQRISInfo } from "qris-converter";

const qrisString = "00020101021126610014COM.GO-JEK.WWW...";
const info = getQRISInfo(qrisString);
console.log(info.merchantName, info.nmid, info.issuer);
```

### Parse from an image

```ts
import { getQRISInfo } from "qris-converter";
import { readFileSync } from "node:fs";

const png = readFileSync("qris.png"); // Uint8Array — PNG or JPEG
const info = getQRISInfo(png);        // also accepts { data, width, height } raw pixels
```

### Convert static → dynamic

```ts
import { convertQRIS } from "qris-converter";

const result = convertQRIS(qrisString, {
  amount: 50000,
  fee: { type: "percentage", value: 2.5 }, // or { type: "fixed", value: 1000 }
});

console.log(result.qris);           // dynamic QRIS payload (CRC recomputed)
console.log(result.injectedAmount); // 1250 — the fee amount
console.log(result.total);          // 51250

// result.image.png is a Uint8Array — send it as a PNG response where needed:
return new Response(result.image!.png, { headers: { "content-type": "image/png" } });
```

### Render an image without converting

```ts
import { renderQRIS, toDataURL } from "qris-converter";

const image = renderQRIS(qrisString, { scale: 8, border: 4 });
image.png;                                   // Uint8Array (grayscale PNG)
toDataURL(image.png);                        // "data:image/png;base64,..."
renderQRIS(qrisString, { svg: true }).svg;   // SVG string
```

## API

| Function | Description |
| --- | --- |
| `getQRISInfo(input)` | Parse from string / PNG / JPEG / raw pixels → `QRISInfo` |
| `convertQRIS(str, options)` | Static → dynamic; returns `ConvertResult` (payload, amounts, parsed info, optional image) |
| `validateQRIS(str)` | `{ valid, errors }` — structure + CRC |
| `parseTLV(str)` | Raw TLV tree |
| `calculateCRC16(str)` | CRC-16/CCITT-FALSE (hex string) |
| `renderQRIS(str, options?)` | QR image: `{ png, width, height, dataUrl?, svg? }` |
| `decodeQRImage(input)` | QR string from PNG/JPEG bytes or raw RGBA pixels |
| `toDataURL(png)` | Base64 data URL from PNG bytes |
| `QRISError` | Typed errors with `code`: `INVALID_INPUT`, `NOT_QRIS`, `INVALID_AMOUNT`, `INVALID_FEE`, `QR_NOT_FOUND`, `IMAGE_DECODE_FAILED`, `UNSUPPORTED_IMAGE` |

Full TypeScript types ship with the package.

## Limitations

- Images: PNG and JPEG (screenshots and photos); raw RGBA pixels accepted for any other format.
- Strings with an invalid CRC still parse (`crcValid: false`) but should not be trusted for payment.
- Amounts are encoded as-is (`50000`, `50000.5`) — EMVCo allows up to 13 characters.

## License

MIT — see [LICENSE](./LICENSE). Bundled third-party libraries and their licenses are listed in [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md).
