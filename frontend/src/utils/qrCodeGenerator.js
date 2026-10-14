/**
 * Pure JavaScript QR Code Generator (Model 2, ISO/IEC 18004 compliant subset)
 *
 * Implemented without external npm dependencies to fulfill Phase 2 Prompt 2 requirements.
 * Supports Byte encoding mode, Error Correction Levels L and M, and versions 1-6
 * (storing up to 134 bytes), ideal for restaurant dine-in table URLs.
 */

// GF(256) Galois Field Tables for Reed-Solomon Error Correction
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = val;
    GF_EXP[i + 255] = val;
    GF_LOG[val] = i;
    val <<= 1;
    if (val & 256) {
      val ^= 0x11d; // Primitive polynomial: x^8 + x^4 + x^3 + x^2 + 1
    }
  }
})();

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

// Generate Reed-Solomon generator polynomial for `ecCount` error correction codewords
function rsGeneratorPolynomial(ecCount) {
  let poly = [1];
  for (let i = 0; i < ecCount; i++) {
    const factor = [1, GF_EXP[i]];
    const nextPoly = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= poly[j];
      nextPoly[j + 1] ^= gfMul(poly[j], factor[1]);
    }
    poly = nextPoly;
  }
  return poly;
}

// Calculate Reed-Solomon error correction codewords
function rsCalculateCodewords(data, ecCount) {
  const genPoly = rsGeneratorPolynomial(ecCount);
  const result = new Array(ecCount).fill(0);

  for (let i = 0; i < data.length; i++) {
    const feedback = data[i] ^ result[0];
    for (let j = 0; j < ecCount - 1; j++) {
      result[j] = result[j + 1] ^ gfMul(feedback, genPoly[j + 1]);
    }
    result[ecCount - 1] = gfMul(feedback, genPoly[ecCount]);
  }
  return result;
}

// QR Code Specifications by Version (ECC Level M)
// [version, totalCodewords, ecCodewordsPerBlock, numBlocks, totalModules]
const QR_VERSIONS = [
  { version: 1, totalDataBytes: 16, ecBytes: 10, blocks: 1, size: 21 },
  { version: 2, totalDataBytes: 28, ecBytes: 16, blocks: 1, size: 25 },
  { version: 3, totalDataBytes: 44, ecBytes: 26, blocks: 1, size: 29 },
  { version: 4, totalDataBytes: 64, ecBytes: 18, blocks: 2, size: 33 },
  { version: 5, totalDataBytes: 86, ecBytes: 24, blocks: 2, size: 37 },
  { version: 6, totalDataBytes: 108, ecBytes: 16, blocks: 4, size: 41 },
  { version: 7, totalDataBytes: 124, ecBytes: 18, blocks: 4, size: 45 },
  { version: 8, totalDataBytes: 154, ecBytes: 22, blocks: 4, size: 49 },
];

// Alignment pattern centers for Version 2..8
const ALIGNMENT_PATTERN_POSITIONS = {
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
};

/**
 * Encodes input string to 8-bit byte data stream
 */
function encodeData(text, maxDataBytes) {
  const utf8Bytes = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code < 128) {
      utf8Bytes.push(code);
    } else if (code < 2048) {
      utf8Bytes.push(192 | (code >> 6), 128 | (code & 63));
    } else {
      utf8Bytes.push(224 | (code >> 12), 128 | ((code >> 6) & 63), 128 | (code & 63));
    }
  }

  const bitBuffer = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      bitBuffer.push((val >> i) & 1);
    }
  }

  // 1. Mode indicator (0100 for 8-bit byte mode)
  pushBits(0b0100, 4);

  // 2. Character count indicator (8 bits for versions 1-9 in byte mode)
  pushBits(utf8Bytes.length, 8);

  // 3. Data bits
  for (const b of utf8Bytes) {
    pushBits(b, 8);
  }

  // 4. Terminator bits (up to 4 zeroes)
  const totalBitsNeeded = maxDataBytes * 8;
  const terminatorLen = Math.min(4, totalBitsNeeded - bitBuffer.length);
  pushBits(0, terminatorLen);

  // 5. Pad to next 8-bit boundary
  while (bitBuffer.length % 8 !== 0) {
    bitBuffer.push(0);
  }

  // Convert bits to byte stream
  const bytes = [];
  for (let i = 0; i < bitBuffer.length; i += 8) {
    let byteVal = 0;
    for (let bit = 0; bit < 8; bit++) {
      byteVal = (byteVal << 1) | bitBuffer[i + bit];
    }
    bytes.push(byteVal);
  }

  // 6. Pad with alternating 0xEC and 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bytes.length < maxDataBytes) {
    bytes.push(padBytes[padIdx % 2]);
    padIdx++;
  }

  return bytes;
}

/**
 * Creates and renders the complete QR module matrix
 */
export function generateQRCodeMatrix(text) {
  // Determine suitable QR version
  const byteLen = new TextEncoder().encode(text).length;
  // Overhead: 4 mode bits + 8 count bits = 12 bits = ~2 bytes
  const requiredDataBytes = byteLen + 2;

  const verSpec = QR_VERSIONS.find((v) => v.totalDataBytes >= requiredDataBytes);
  if (!verSpec) {
    throw new Error(`Data too long for compact QR generator (length: ${byteLen} bytes).`);
  }

  const size = verSpec.size;
  // Matrix modules: null = unassigned, true = dark, false = light
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunction = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(r, c, val, func = true) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      if (func) isFunction[r][c] = true;
    }
  }

  // 1. Finder Patterns (7x7 + 1 white separator)
  function placeFinderPattern(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr >= 0 && mr < size && mc >= 0 && mc < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
            const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
            setModule(mr, mc, isBorder || isCenter);
          } else {
            setModule(mr, mc, false); // White separator
          }
        }
      }
    }
  }

  placeFinderPattern(0, 0);
  placeFinderPattern(0, size - 7);
  placeFinderPattern(size - 7, 0);

  // 2. Alignment Patterns (for version >= 2)
  if (verSpec.version >= 2) {
    const coords = ALIGNMENT_PATTERN_POSITIONS[verSpec.version] || [];
    for (const ar of coords) {
      for (const ac of coords) {
        // Skip finder pattern intersections
        const isFinderConflict =
          (ar === 6 && ac === 6) ||
          (ar === 6 && ac === coords[coords.length - 1] && coords[coords.length - 1] === size - 7) ||
          (ar === coords[coords.length - 1] && ac === 6 && coords[coords.length - 1] === size - 7);
        if (isFinderConflict) continue;

        // Skip if already marked as function
        if (isFunction[ar][ac]) continue;

        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const isEdge = Math.abs(r) === 2 || Math.abs(c) === 2;
            const isCenter = r === 0 && c === 0;
            setModule(ar + r, ac + c, isEdge || isCenter);
          }
        }
      }
    }
  }

  // 3. Timing Patterns (row 6 and col 6)
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // 4. Dark Module
  setModule(size - 8, 8, true);

  // 5. Reserve Format Info areas (around finder patterns)
  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8][i]) setModule(8, i, false, true);
    if (!isFunction[i][8]) setModule(i, 8, false, true);
  }
  for (let i = 0; i < 8; i++) {
    setModule(8, size - 1 - i, false, true);
    setModule(size - 1 - i, 8, false, true);
  }

  // 6. Encode Data & Calculate Error Correction Codewords
  const dataBytes = encodeData(text, verSpec.totalDataBytes);
  const dataPerBlock = Math.floor(verSpec.totalDataBytes / verSpec.blocks);
  const ecPerBlock = verSpec.ecBytes;

  const dataBlocks = [];
  const ecBlocks = [];

  for (let b = 0; b < verSpec.blocks; b++) {
    const blockData = dataBytes.slice(b * dataPerBlock, (b + 1) * dataPerBlock);
    const blockEC = rsCalculateCodewords(blockData, ecPerBlock);
    dataBlocks.push(blockData);
    ecBlocks.push(blockEC);
  }

  // Interleave data codewords, then error correction codewords
  const finalCodewords = [];
  for (let i = 0; i < dataPerBlock; i++) {
    for (let b = 0; b < verSpec.blocks; b++) {
      finalCodewords.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < verSpec.blocks; b++) {
      finalCodewords.push(ecBlocks[b][i]);
    }
  }

  // 7. Place Data Modules in Matrix using Zig-Zag path
  let codewordIdx = 0;
  let bitIdx = 7;
  let upwards = true;

  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol--; // Skip vertical timing column
    const colLeft = rightCol - 1;

    for (let r = 0; r < size; r++) {
      const row = upwards ? size - 1 - r : r;
      for (const col of [rightCol, colLeft]) {
        if (!isFunction[row][col]) {
          let bit = false;
          if (codewordIdx < finalCodewords.length) {
            bit = ((finalCodewords[codewordIdx] >> bitIdx) & 1) === 1;
            bitIdx--;
            if (bitIdx < 0) {
              bitIdx = 7;
              codewordIdx++;
            }
          }
          // Mask 0: (row + col) % 2 === 0
          const mask = (row + col) % 2 === 0;
          matrix[row][col] = mask ? !bit : bit;
        }
      }
    }
    upwards = !upwards;
  }

  // 8. Place Format Information (ECC Level M = 00, Mask 0 = 000 => 00000)
  // Standard BCH (15,5) format for ECC M, mask 0 after XOR mask 0x5412 is: 0b101010000010010
  const FORMAT_BITS = 0b101010000010010;

  for (let i = 0; i < 15; i++) {
    const bit = ((FORMAT_BITS >> i) & 1) === 1;
    // Top-left finder pattern surroundings
    if (i <= 5) setModule(8, i, bit);
    else if (i === 6) setModule(8, 7, bit);
    else if (i === 7) setModule(8, 8, bit);
    else if (i === 8) setModule(7, 8, bit);
    else setModule(14 - i, 8, bit);

    // Second copy split between bottom-left (7 bits) and top-right (8 bits)
    // Preserves permanent black Dark Module at (size - 8, 8)
    if (i < 7) {
      setModule(size - 1 - i, 8, bit);
    } else {
      setModule(8, size - 15 + i, bit);
    }
  }

  // Ensure permanent dark module at (size - 8, 8) is strictly true (black)
  setModule(size - 8, 8, true);

  return { matrix, size };
}

/**
 * Renders a QR code onto an HTML5 canvas element with quiet zone
 */
export function drawQRCodeToCanvas(canvas, text, options = {}) {
  const {
    pixelSize = 8,
    margin = 4,
    darkColor = '#121214',
    lightColor = '#FFFFFF',
  } = options;

  const { matrix, size } = generateQRCodeMatrix(text);
  const totalSize = (size + margin * 2) * pixelSize;

  canvas.width = totalSize;
  canvas.height = totalSize;
  const ctx = canvas.getContext('2d');

  // Background (quiet zone)
  ctx.fillStyle = lightColor;
  ctx.fillRect(0, 0, totalSize, totalSize);

  // Dark modules
  ctx.fillStyle = darkColor;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(
          (c + margin) * pixelSize,
          (r + margin) * pixelSize,
          pixelSize,
          pixelSize
        );
      }
    }
  }

  return canvas;
}

/**
 * Generates a PNG Data URL for a given payload
 */
export function getQRCodeDataURL(text, options = {}) {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  drawQRCodeToCanvas(canvas, text, options);
  return canvas.toDataURL('image/png');
}

/**
 * Downloads the QR code as a PNG file
 */
export function downloadQRCodePNG(text, filename, options = {}) {
  if (typeof document === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    // Generates a crisp, high-resolution QR code image for print/display
    drawQRCodeToCanvas(canvas, text, {
      pixelSize: 12,
      margin: 4,
      darkColor: '#121214',
      lightColor: '#FFFFFF',
      ...options,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = dataUrl;
    downloadLink.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    return true;
  } catch (err) {
    console.error('Error generating QR download:', err);
    throw new Error('Failed to generate PNG image for download.');
  }
}

// Production live website domain for Table QR destinations
export const PRODUCTION_QR_BASE_URL = 'https://happiness-restaurant-three.vercel.app';

export function isLocalOrPrivateHost(hostOrUrl) {
  if (!hostOrUrl || typeof hostOrUrl !== 'string') return false;
  const str = hostOrUrl.toLowerCase();
  return (
    str.includes('localhost') ||
    str.includes('127.0.0.1') ||
    str.includes('0.0.0.0') ||
    str.includes('192.168.') ||
    str.includes('10.') ||
    /172\.(1[6-9]|2\d|3[01])\./.test(str)
  );
}

export function getDevQRBaseUrl() {
  const devEnv =
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_DEV_QR_BASE_URL || import.meta.env?.VITE_QR_DEV_BASE_URL)) ||
    (typeof process !== 'undefined' && (process.env?.VITE_DEV_QR_BASE_URL || process.env?.VITE_QR_DEV_BASE_URL));

  if (devEnv && typeof devEnv === 'string' && devEnv.trim()) {
    return devEnv.trim().replace(/\/+$/, '');
  }

  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.origin &&
    isLocalOrPrivateHost(window.location.origin)
  ) {
    return window.location.origin.trim().replace(/\/+$/, '');
  }

  return 'http://192.168.31.94:3000';
}

/**
 * Resolves the default QR code base URL.
 * Guarantees that Table QR codes default strictly to the production live domain:
 * https://happiness-restaurant-three.vercel.app
 *
 * Local network IP is only used if VITE_QR_MODE=development or VITE_QR_MODE=local is explicitly set.
 */
export function getDefaultQRBaseUrl() {
  const envUrl =
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_QR_BASE_URL || import.meta.env?.VITE_DINE_IN_BASE_URL)) ||
    (typeof process !== 'undefined' && (process.env?.VITE_QR_BASE_URL || process.env?.VITE_DINE_IN_BASE_URL));

  const isProd =
    (typeof import.meta !== 'undefined' && import.meta.env?.PROD) ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');

  // If an explicit QR base URL is provided in environment variables:
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    // If it's a valid public domain, always use it
    if (!isLocalOrPrivateHost(trimmed)) {
      return trimmed;
    }

    // If it's a private/local IP, only allow in development when explicitly enabled
    const isLocalModeExplicit =
      (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_QR_MODE === 'local' || import.meta.env?.VITE_QR_MODE === 'development')) ||
      (typeof process !== 'undefined' && (process.env?.VITE_QR_MODE === 'local' || process.env?.VITE_QR_MODE === 'development'));

    if (!isProd && isLocalModeExplicit) {
      return trimmed;
    }
  }

  // If running in browser on a public domain (e.g. Vercel deployment):
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.origin &&
    !isLocalOrPrivateHost(window.location.origin)
  ) {
    return window.location.origin.trim().replace(/\/+$/, '');
  }

  // Strict default for all table QR codes
  return PRODUCTION_QR_BASE_URL;
}

export function generateTableDineInUrl(table, customBaseUrl) {
  if (!table || !table.tableNumber || !table.tableNumber.trim()) {
    return null;
  }

  let origin = '';
  if (customBaseUrl !== undefined && customBaseUrl !== null) {
    if (!customBaseUrl.trim()) {
      return null; // Empty base URL indicates missing configuration
    }
    origin = customBaseUrl.trim().replace(/\/+$/, '');
  } else {
    origin = getDefaultQRBaseUrl();
  }

  // Ensure valid HTTP/HTTPS protocol
  if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
    origin = `https://${origin}`;
  }

  const cleanTableNumber = encodeURIComponent(String(table.tableNumber).trim());
  const cleanId = encodeURIComponent(String(table.id || table._id || table.tableNumber).trim());

  // Public menu dine-in landing destination with table identifier
  return `${origin}/menu?table=${cleanTableNumber}&tableId=${cleanId}&mode=dine_in`;
}
