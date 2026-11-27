// Erzeugt die App-Icons (PNG + SVG) ohne Zusatzpakete: node tools/icons.js
// Motiv: Karteikarte mit roter Kopflinie auf königsblauem Grund.

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BLAU = [0x23, 0x40, 0xb8];
const WEISS = [0xff, 0xff, 0xff];
const ROT = [0xc4, 0x30, 0x3a];
const LINIE = [0xb9, 0xc8, 0xec];

/** Motiv in Einheiten 0..1; maskierbar = voller Hintergrund, Motiv in der sicheren Mitte. */
function farbeBei(x, y, maskierbar) {
  const r = maskierbar ? 0 : 0.18; // Eckenradius des Hintergrunds
  const innen = (px, py, x0, y0, x1, y1, rad) => {
    if (px < x0 || px > x1 || py < y0 || py > y1) return false;
    const cx = Math.min(Math.max(px, x0 + rad), x1 - rad);
    const cy = Math.min(Math.max(py, y0 + rad), y1 - rad);
    return (px - cx) ** 2 + (py - cy) ** 2 <= rad * rad;
  };
  if (!innen(x, y, 0, 0, 1, 1, r)) return null; // durchsichtig

  const s = maskierbar ? 0.72 : 1; // Motiv verkleinern für die sichere Zone
  const ux = 0.5 + (x - 0.5) / s;
  const uy = 0.5 + (y - 0.5) / s;
  const k = { x0: 0.17, y0: 0.24, x1: 0.83, y1: 0.76 };
  if (innen(ux, uy, k.x0, k.y0, k.x1, k.y1, 0.04)) {
    if (uy > 0.345 && uy < 0.375) return ROT;
    for (const ly of [0.47, 0.57, 0.67]) if (uy > ly && uy < ly + 0.018 && ux > 0.24 && ux < 0.76) return LINIE;
    return WEISS;
  }
  return BLAU;
}

function crc32(daten) {
  let c;
  let crc = 0xffffffff;
  for (const b of daten) {
    c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function abschnitt(typ, daten) {
  const laenge = Buffer.alloc(4);
  laenge.writeUInt32BE(daten.length);
  const inhalt = Buffer.concat([Buffer.from(typ, 'ascii'), daten]);
  const pruef = Buffer.alloc(4);
  pruef.writeUInt32BE(crc32(inhalt));
  return Buffer.concat([laenge, inhalt, pruef]);
}

function png(groesse, maskierbar) {
  const N = 4; // Kantenglättung: 4×4 Abtastpunkte pro Pixel
  const zeilen = [];
  for (let py = 0; py < groesse; py++) {
    const zeile = Buffer.alloc(1 + groesse * 4); // Filterbyte 0 + RGBA
    for (let px = 0; px < groesse; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < N; sy++) {
        for (let sx = 0; sx < N; sx++) {
          const f = farbeBei((px + (sx + 0.5) / N) / groesse, (py + (sy + 0.5) / N) / groesse, maskierbar);
          if (!f) continue;
          r += f[0]; g += f[1]; b += f[2]; a += 1;
        }
      }
      const o = 1 + px * 4;
      if (a > 0) {
        zeile[o] = Math.round(r / a);
        zeile[o + 1] = Math.round(g / a);
        zeile[o + 2] = Math.round(b / a);
      }
      zeile[o + 3] = Math.round((a / (N * N)) * 255);
    }
    zeilen.push(zeile);
  }
  const kopf = Buffer.alloc(13);
  kopf.writeUInt32BE(groesse, 0);
  kopf.writeUInt32BE(groesse, 4);
  kopf[8] = 8; // Bittiefe
  kopf[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    abschnitt('IHDR', kopf),
    abschnitt('IDAT', deflateSync(Buffer.concat(zeilen), { level: 9 })),
    abschnitt('IEND', Buffer.alloc(0)),
  ]);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="18" fill="#2340b8"/>
  <rect x="17" y="24" width="66" height="52" rx="4" fill="#fff"/>
  <rect x="17" y="34.5" width="66" height="3" fill="#c4303a"/>
  <rect x="24" y="47" width="52" height="1.8" fill="#b9c8ec"/>
  <rect x="24" y="57" width="52" height="1.8" fill="#b9c8ec"/>
  <rect x="24" y="67" width="52" height="1.8" fill="#b9c8ec"/>
</svg>
`;

const ziel = new URL('../icons/', import.meta.url);
mkdirSync(ziel, { recursive: true });
writeFileSync(new URL('icon.svg', ziel), svg);
writeFileSync(new URL('icon-192.png', ziel), png(192, false));
writeFileSync(new URL('icon-512.png', ziel), png(512, false));
writeFileSync(new URL('icon-maskierbar-512.png', ziel), png(512, true));
writeFileSync(new URL('apple-touch-icon.png', ziel), png(180, true));
console.log('Icons erzeugt in icons/');
