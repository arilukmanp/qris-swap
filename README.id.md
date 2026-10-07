# qris-converter

[English](README.md) | **Bahasa Indonesia**

Parse, validasi, dan konversi kode **QRIS** Indonesia, termasuk static → dynamic, sekaligus render gambar QR-nya. Berjalan di Node.js ≥ 18, Bun, Deno, browser, dan edge runtime.

Tanpa dependensi, fully typed, ESM + CJS.

## Fitur

- **QRIS parser**: kirim string QRIS, buffer PNG/JPEG, atau pixel RGBA ke `getQRISInfo()`, lalu dapatkan nama merchant, kota, kategori, issuer, NMID, amount, tip, status CRC, dan TLV tree lengkap.
- **Konverter static → dynamic**: `convertQRIS()` menyuntikkan amount dan service fee opsional (fixed atau percentage), mengubah point of initiation menjadi dynamic, dan menghitung ulang CRC16.
- **Validasi**: `validateQRIS()` memeriksa struktur dan CRC.
- **Dukungan gambar**: `decodeQRImage()` membaca kode QR dari gambar; `renderQRIS()` mengubah payload apa pun menjadi byte PNG, data URL, atau SVG.
- **CRC16 sesuai spec**: CRC-16/CCITT-FALSE dihitung dari byte UTF-8, sesuai ketentuan EMVCo.

## Instalasi

```bash
npm install qris-converter
# atau
pnpm add qris-converter
# atau
yarn add qris-converter
# atau
bun add qris-converter
```

## Penggunaan

### Parse string QRIS

```ts
import { getQRISInfo } from "qris-converter";

const qrisString = "00020101021126610014COM.GO-JEK.WWW...";
const info = getQRISInfo(qrisString);
console.log(info.merchantName, info.nmid, info.issuer);
```

### Parse dari gambar

```ts
import { getQRISInfo } from "qris-converter";
import { readFileSync } from "node:fs";

const png = readFileSync("qris.png"); // Uint8Array (PNG atau JPEG)
const info = getQRISInfo(png);        // atau { data, width, height } untuk pixel RGBA
```

### Konversi static → dynamic

```ts
import { convertQRIS } from "qris-converter";

const result = convertQRIS(qrisString, {
  amount: 50000,
  fee: { type: "percentage", value: 2.5 }, // atau { type: "fixed", value: 1000 }
});

console.log(result.qris);           // payload dynamic, CRC dihitung ulang
console.log(result.injectedAmount); // 1250, nilai fee-nya
console.log(result.total);          // 51250

// result.image!.png adalah Uint8Array; kirim sebagai respons PNG bila perlu:
return new Response(result.image!.png, { headers: { "content-type": "image/png" } });
```

### Render gambar tanpa konversi

```ts
import { renderQRIS, toDataURL } from "qris-converter";

const image = renderQRIS(qrisString, { scale: 8, border: 4 });
image.png;                                   // Uint8Array (PNG grayscale)
toDataURL(image.png);                        // "data:image/png;base64,..."
renderQRIS(qrisString, { svg: true }).svg;   // string SVG
```

## API

| Fungsi | Deskripsi |
| --- | --- |
| `getQRISInfo(input)` | Parse dari string / PNG / JPEG / pixel RGBA → `QRISInfo` |
| `convertQRIS(str, options)` | Static → dynamic; mengembalikan `ConvertResult` (payload, nominal, info hasil parse, gambar opsional) |
| `validateQRIS(str)` | `{ valid, errors }`: struktur + CRC |
| `parseTLV(str)` | TLV tree (raw) |
| `calculateCRC16(str)` | CRC-16/CCITT-FALSE (string hex) |
| `renderQRIS(str, options?)` | Gambar QR: `{ png, width, height, dataUrl?, svg? }` |
| `decodeQRImage(input)` | String QR dari byte PNG/JPEG atau pixel RGBA |
| `toDataURL(png)` | Data URL base64 dari byte PNG |
| `QRISError` | Error bertipe dengan `code`: `INVALID_INPUT`, `NOT_QRIS`, `INVALID_AMOUNT`, `INVALID_FEE`, `QR_NOT_FOUND`, `IMAGE_DECODE_FAILED`, `UNSUPPORTED_IMAGE` |

### `getQRISInfo(input)`

Parse payload QRIS dari string, byte gambar PNG/JPEG, atau pixel RGBA.

**Parameter:**

| Param | Type | Wajib | Default | Deskripsi |
| --- | --- | --- | --- | --- |
| `input` | `string \| Uint8Array \| PixelData` | ✅ | - | String payload QRIS, byte PNG/JPEG, atau pixel RGBA dalam bentuk `{ data, width, height }` |

**Return:** `QRISInfo`

| Field | Type | Deskripsi |
| --- | --- | --- |
| `version` | `string` | Versi format payload |
| `method` | `"static" \| "dynamic"` | Metode point of initiation |
| `merchantName` | `string` | Nama merchant (tag 59) |
| `merchantCity` | `string` | Kota merchant (tag 60) |
| `merchantCategoryCode` | `string` | Kode MCC, misalnya `5812` (tag 52) |
| `merchantCategory` | `string?` | Deskripsi MCC jika tersedia |
| `issuer` | `string?` | Penyedia pembayaran dari merchant account info, misalnya `GO-JEK` |
| `nmid` | `string?` | National Merchant ID |
| `currency` | `string` | Kode mata uang ISO, `360` untuk IDR (tag 53) |
| `amount` | `string?` | Nominal transaksi, terisi pada kode dynamic (tag 54) |
| `tipIndicator` | `"prompt" \| "fixed" \| "percentage"?` | Jenis prompt fee (tag 55) |
| `tipFixed` | `string?` | Nilai fee fixed (tag 56) |
| `tipPercentage` | `string?` | Nilai fee percentage (tag 57) |
| `countryCode` | `string` | Kode negara ISO, `ID` (tag 58) |
| `postalCode` | `string` | Kode pos (tag 61) |
| `crc` | `string` | Nilai CRC yang tertulis di payload |
| `crcValid` | `boolean` | Apakah CRC cocok dengan sisa payload |
| `merchantAccountInfo` | `MerchantAccountInfo[]` | Entri penyedia pembayaran (tag 26 sampai 51) |
| `additionalData` | `TLV[]?` | Data tambahan (tag 62) |
| `raw` | `TLV[]` | TLV tree lengkap |

### `convertQRIS(str, options)`

Konversi payload QRIS static menjadi dynamic: menyuntikkan amount, menerapkan service fee opsional, mengubah point of initiation, dan menghitung ulang CRC16.

**Parameter:**

| Param | Type | Wajib | Default | Deskripsi |
| --- | --- | --- | --- | --- |
| `str` | `string` | ✅ | - | Payload QRIS yang akan dikonversi |
| `options.amount` | `number` | ✅ | - | Nominal pembayaran |
| `options.fee` | `FeeOption` | ❌ | - | Service fee: `{ type: "fixed" \| "percentage", value: number }` |
| `options.render` | `boolean \| RenderOptions` | ❌ | `true` | `false` untuk melewati gambar QR; objek untuk kustomisasi |

**Return:** `ConvertResult`

| Field | Type | Deskripsi |
| --- | --- | --- |
| `qris` | `string` | Payload dynamic dengan CRC yang dihitung ulang |
| `merchantName` | `string` | Nama merchant |
| `merchantCity` | `string` | Kota merchant |
| `nmid` | `string?` | National Merchant ID |
| `issuer` | `string?` | Penyedia pembayaran |
| `method` | `"dynamic"` | Selalu dynamic |
| `amount` | `number` | Nominal yang Anda masukkan |
| `fee` | `FeeOption?` | Fee yang Anda masukkan |
| `injectedAmount` | `number` | Nilai fee yang diterapkan |
| `total` | `number` | `amount` + `injectedAmount` |
| `parsed` | `QRISInfo` | Hasil parse lengkap dari QRIS dynamic |
| `image` | `QRISImage?` | Gambar QR, aktif selama `render` tidak dimatikan |

### `validateQRIS(str)`

Periksa struktur dan CRC sebuah payload QRIS.

**Parameter:**

| Param | Type | Wajib | Default | Deskripsi |
| --- | --- | --- | --- | --- |
| `str` | `string` | ✅ | - | Payload QRIS |

**Return:** `{ valid: boolean, errors: string[] }`; `valid` bernilai `true` jika struktur dan CRC cocok, dan `errors` berisi daftar masalahnya.

### `parseTLV(str)`

Parse payload TLV EMVCo menjadi tree.

**Parameter:**

| Param | Type | Wajib | Default | Deskripsi |
| --- | --- | --- | --- | --- |
| `str` | `string` | ✅ | - | Payload TLV |

**Return:** `TLV[]`, setiap entri `{ tag, name, length, value, children? }`.

### `calculateCRC16(str)`

Hitung checksum CRC-16/CCITT-FALSE dari byte UTF-8.

**Parameter:**

| Param | Type | Wajib | Default | Deskripsi |
| --- | --- | --- | --- | --- |
| `str` | `string` | ✅ | - | Payload tanpa 4 karakter CRC di akhir |

**Return:** `string`, 4 karakter hex huruf besar.

### `renderQRIS(str, options?)`

Render payload QRIS menjadi gambar PNG grayscale.

**Parameter:**

| Param | Type | Wajib | Default | Deskripsi |
| --- | --- | --- | --- | --- |
| `str` | `string` | ✅ | - | Payload QRIS |
| `options.scale` | `number` | ❌ | `8` | Pixel per module |
| `options.border` | `number` | ❌ | `4` | Lebar quiet zone dalam satuan module |
| `options.ecc` | `"L" \| "M" \| "Q" \| "H"` | ❌ | `"M"` | Level error correction |
| `options.dataUrl` | `boolean` | ❌ | `false` | Sertakan URL `data:image/png` |
| `options.svg` | `boolean` | ❌ | `false` | Sertakan string SVG |

**Return:** `QRISImage`: `{ png: Uint8Array, width: number, height: number, dataUrl?: string, svg?: string }`.

### `decodeQRImage(input)`

Baca konten QR dari sebuah gambar.

**Parameter:**

| Param | Type | Wajib | Default | Deskripsi |
| --- | --- | --- | --- | --- |
| `input` | `Uint8Array \| PixelData` | ✅ | - | Byte PNG/JPEG, atau pixel RGBA `{ data, width, height }` |

**Return:** `string`, payload QR. Melempar `QRISError` dengan code `QR_NOT_FOUND` jika tidak ada kode QR di gambar.

### `toDataURL(png)`

Bungkus byte PNG menjadi data URL.

**Parameter:**

| Param | Type | Wajib | Default | Deskripsi |
| --- | --- | --- | --- | --- |
| `png` | `Uint8Array` | ✅ | - | Byte gambar PNG |

**Return:** `string`, URL `data:image/png;base64,...`.

Semua fungsi berjalan synchronous; error yang dilempar selalu `QRISError` dengan `code` (tercantum di tabel atas). TypeScript types lengkap sudah termasuk di dalam package.

## Batasan

- Gambar: PNG dan JPEG (screenshot dan foto); pixel RGBA bisa dipakai untuk format lainnya.
- String dengan CRC tidak valid tetap bisa di-parse (`crcValid: false`), tapi jangan dipakai untuk pembayaran.
- Amount di-encode apa adanya (`50000`, `50000.5`); EMVCo memperbolehkan hingga 13 karakter.

## Lisensi

MIT, lihat [LICENSE](./LICENSE). Library pihak ketiga yang dibundel beserta lisensinya ada di [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md).
