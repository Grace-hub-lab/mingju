// 纯 JS 生成 PWA 图标（朱红底 + 一本翻开的书），只依赖 Node 内置 zlib
// 用法：node scripts/make-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

// ---------- PNG 编码 ----------
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- 绘制 ----------
const BG = [163, 58, 42];      // 朱红
const PAGE = [255, 246, 228];  // 米白纸
const LINE = [214, 170, 140];  // 页面上的“文字”线

// 返回点 (x, y) 的颜色；坐标为 0~1，先按 scale 缩回原始坐标
function colorAt(x, y, scale) {
  const ux = 0.5 + (x - 0.5) / scale;
  const uy = 0.5 + (y - 0.5) / scale;
  const half = 0.34;          // 单页宽度
  const d = Math.abs(ux - 0.5);
  if (d > 0.012 && d < half) {
    const t = d / half;                 // 0 = 书脊，1 = 外沿
    const top = 0.34 - 0.06 * t;        // 外沿比书脊高，形成翻开的弧度
    const bottom = top + 0.36;
    if (uy >= top && uy <= bottom) {
      // 每页 4 行“文字”
      if (t > 0.18 && t < 0.86) {
        for (let k = 0; k < 4; k++) {
          const ly = top + 0.08 + k * 0.07;
          if (uy >= ly && uy <= ly + 0.018) return LINE;
        }
      }
      return PAGE;
    }
  }
  return BG;
}

function draw(size, scale) {
  const px = Buffer.alloc(size * size * 4);
  const SS = 4; // 4x4 超采样抗锯齿
  for (let py = 0; py < size; py++) {
    for (let pxl = 0; pxl < size; pxl++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = colorAt((pxl + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size, scale);
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = SS * SS, i = (py * size + pxl) * 4;
      px[i] = Math.round(r / n);
      px[i + 1] = Math.round(g / n);
      px[i + 2] = Math.round(b / n);
      px[i + 3] = 255; // 不透明，iOS 主屏图标不会出现黑底
    }
  }
  return encodePng(size, px);
}

const targets = [
  ['icon-180.png', 180, 1],
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-512-maskable.png', 512, 0.8], // maskable 留安全边距
];
for (const [name, size, scale] of targets) {
  fs.writeFileSync(path.join(OUT, name), draw(size, scale));
  console.log('生成', name);
}
