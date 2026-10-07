# Swap QRIS Static to QRIS Dynamic

**English** | [Bahasa Indonesia](README.id.md)

Parse, validate, and convert Indonesian **QRIS** codes, including static → dynamic, and render QR images. Runs on Node.js ≥ 18, Bun, Deno, browsers, and edge runtimes.

Zero dependencies, fully typed, ESM + CJS.

## Features

- **QRIS parser**: give `getQRISInfo()` a QRIS string, a PNG/JPEG buffer, or raw RGBA pixels, and get back merchant name, city, category, issuer, NMID, amount, tips, CRC validity, and the full TLV tree.
- **Static → dynamic converter**: `convertQRIS()` injects an amount and an optional service fee (fixed or percentage), flips the point of initiation to dynamic, and recomputes the CRC16.
- **Validation**: `validateQRIS()` checks the structure and the CRC.
- **Image support**: `decodeQRImage()` reads a QR code out of an image; `renderQRIS()` turns any payload into PNG bytes, a data URL, or SVG.
- **Spec-correct CRC16**: CRC-16/CCITT-FALSE over UTF-8 bytes, as EMVCo specifies.

## Install

```bash
npm install qris-swap
# or
pnpm add qris-swap
# or
yarn add qris-swap
# or
bun add qris-swap
```

## Quickstart

### Parse a QRIS string

```ts
import { getQRISInfo } from "qris-swap";

const qrisString = "00020101021126610014COM.GO-JEK.WWW...";
const info = getQRISInfo(qrisString);
console.log(info.merchantName, info.nmid, info.issuer);
```

### Parse from an image

```ts
import { getQRISInfo } from "qris-swap";
import { readFileSync } from "node:fs";

const png = readFileSync("qris.png"); // Uint8Array (PNG or JPEG)
const info = getQRISInfo(png);        // or { data, width, height } raw pixels
```

### Convert static → dynamic

```ts
import { convertQRIS } from "qris-swap";

const result = convertQRIS(qrisString, {
  amount: 50000,
  fee: { type: "percentage", value: 2.5 }, // or { type: "fixed", value: 1000 }
});

console.log(result.qris);           // dynamic payload, CRC recomputed
console.log(result.injectedAmount); // 1250, the fee
console.log(result.total);          // 51250

// result.image!.png is a Uint8Array; send it as a PNG response where needed:
return new Response(result.image!.png, { headers: { "content-type": "image/png" } });
```

### Render an image without converting

```ts
import { renderQRIS, toDataURL } from "qris-swap";

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
| `validateQRIS(str)` | `{ valid, errors }`: structure + CRC |
| `parseTLV(str)` | Raw TLV tree |
| `calculateCRC16(str)` | CRC-16/CCITT-FALSE (hex string) |
| `renderQRIS(str, options?)` | QR image: `{ png, width, height, dataUrl?, svg? }` |
| `decodeQRImage(input)` | QR string from PNG/JPEG bytes or raw RGBA pixels |
| `toDataURL(png)` | Base64 data URL from PNG bytes |
| `QRISError` | Typed errors with `code`: `INVALID_INPUT`, `NOT_QRIS`, `INVALID_AMOUNT`, `INVALID_FEE`, `QR_NOT_FOUND`, `IMAGE_DECODE_FAILED`, `UNSUPPORTED_IMAGE` |

### `getQRISInfo(input)`

Parse a QRIS payload from a string, PNG/JPEG image bytes, or raw RGBA pixels.

**Parameters:**

| Param | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `input` | `string \| Uint8Array \| PixelData` | ✅ | - | QRIS payload string, PNG/JPEG bytes, or raw RGBA pixels as `{ data, width, height }` |

**Returns:** `QRISInfo`

| Field | Type | Description |
| --- | --- | --- |
| `version` | `string` | Payload format version |
| `method` | `"static" \| "dynamic"` | Point of initiation method |
| `merchantName` | `string` | Merchant name (tag 59) |
| `merchantCity` | `string` | Merchant city (tag 60) |
| `merchantCategoryCode` | `string` | MCC code such as `5812` (tag 52) |
| `merchantCategory` | `string?` | MCC description when known |
| `issuer` | `string?` | Payment provider from the merchant account info, e.g. `GO-JEK` |
| `nmid` | `string?` | National Merchant ID |
| `currency` | `string` | ISO currency code, `360` for IDR (tag 53) |
| `amount` | `string?` | Transaction amount, set on dynamic codes (tag 54) |
| `tipIndicator` | `"prompt" \| "fixed" \| "percentage"?` | Fee prompt type (tag 55) |
| `tipFixed` | `string?` | Fixed fee value (tag 56) |
| `tipPercentage` | `string?` | Percentage fee value (tag 57) |
| `countryCode` | `string` | ISO country code, `ID` (tag 58) |
| `postalCode` | `string` | Postal code (tag 61) |
| `crc` | `string` | CRC value declared in the payload |
| `crcValid` | `boolean` | Whether the CRC matches the rest of the payload |
| `merchantAccountInfo` | `MerchantAccountInfo[]` | Provider entries (tags 26 to 51) |
| `additionalData` | `TLV[]?` | Additional data (tag 62) |
| `raw` | `TLV[]` | Full TLV tree |

### `convertQRIS(str, options)`

Convert a static QRIS payload into a dynamic one: injects the amount, applies an optional service fee, flips the point of initiation, and recomputes the CRC16.

**Parameters:**

| Param | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `str` | `string` | ✅ | - | QRIS payload to convert |
| `options.amount` | `number` | ✅ | - | Payment amount |
| `options.fee` | `FeeOption` | ❌ | - | Service fee: `{ type: "fixed" \| "percentage", value: number }` |
| `options.render` | `boolean \| RenderOptions` | ❌ | `true` | `false` skips the QR image; an object customizes it |

**Returns:** `ConvertResult`

| Field | Type | Description |
| --- | --- | --- |
| `qris` | `string` | Dynamic payload with a recomputed CRC |
| `merchantName` | `string` | Merchant name |
| `merchantCity` | `string` | Merchant city |
| `nmid` | `string?` | National Merchant ID |
| `issuer` | `string?` | Payment provider |
| `method` | `"dynamic"` | Always dynamic |
| `amount` | `number` | The amount you passed in |
| `fee` | `FeeOption?` | The fee you passed in |
| `injectedAmount` | `number` | Fee amount applied |
| `total` | `number` | `amount` + `injectedAmount` |
| `parsed` | `QRISInfo` | Full parse of the dynamic result |
| `image` | `QRISImage?` | QR image, when `render` is not off |

### `validateQRIS(str)`

Check a QRIS payload's structure and CRC.

**Parameters:**

| Param | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `str` | `string` | ✅ | - | QRIS payload |

**Returns:** `{ valid: boolean, errors: string[] }`; `valid` is `true` when the structure and CRC check out, and `errors` lists what failed.

### `parseTLV(str)`

Parse an EMVCo TLV payload into a tree.

**Parameters:**

| Param | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `str` | `string` | ✅ | - | TLV payload |

**Returns:** `TLV[]`, each entry `{ tag, name, length, value, children? }`.

### `calculateCRC16(str)`

Compute the CRC-16/CCITT-FALSE checksum over UTF-8 bytes.

**Parameters:**

| Param | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `str` | `string` | ✅ | - | Payload without its final 4 CRC characters |

**Returns:** `string`, 4 uppercase hex characters.

### `renderQRIS(str, options?)`

Render any QRIS payload as a grayscale PNG.

**Parameters:**

| Param | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `str` | `string` | ✅ | - | QRIS payload |
| `options.scale` | `number` | ❌ | `8` | Pixels per module |
| `options.border` | `number` | ❌ | `4` | Quiet zone width in modules |
| `options.ecc` | `"L" \| "M" \| "Q" \| "H"` | ❌ | `"M"` | Error correction level |
| `options.dataUrl` | `boolean` | ❌ | `false` | Include a `data:image/png` URL |
| `options.svg` | `boolean` | ❌ | `false` | Include an SVG string |

**Returns:** `QRISImage`: `{ png: Uint8Array, width: number, height: number, dataUrl?: string, svg?: string }`.

### `decodeQRImage(input)`

Read the QR content out of an image.

**Parameters:**

| Param | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `input` | `Uint8Array \| PixelData` | ✅ | - | PNG/JPEG bytes, or raw RGBA pixels as `{ data, width, height }` |

**Returns:** `string`, the QR payload. Throws `QRISError` with code `QR_NOT_FOUND` when no QR code is found.

### `toDataURL(png)`

Wrap PNG bytes in a data URL.

**Parameters:**

| Param | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `png` | `Uint8Array` | ✅ | - | PNG image bytes |

**Returns:** `string`, a `data:image/png;base64,...` URL.

All functions are synchronous; errors are `QRISError` instances with a `code` (listed in the table above). Full TypeScript types ship with the package.

## Limitations

- Images: PNG and JPEG (screenshots and photos); raw RGBA pixels work for any other format.
- Strings with an invalid CRC still parse (`crcValid: false`) but should not be trusted for payment.
- Amounts are encoded as-is (`50000`, `50000.5`); EMVCo allows up to 13 characters.

## License

MIT, see [LICENSE](./LICENSE). Bundled third-party libraries and their licenses are listed in [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md).
