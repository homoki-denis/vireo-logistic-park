"use client";
import * as THREE from "three";

const cache = new Map<string, THREE.Texture>();

function canvasTexture(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  cache.set(key, t);
  return t;
}

/** one solar panel cell (repeat it over the roof) */
export function solarTexture() {
  return canvasTexture("solar", 128, 64, (ctx) => {
    ctx.fillStyle = "#dfe5ee";
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = "#24365e";
    ctx.fillRect(3, 3, 122, 58);
    ctx.strokeStyle = "rgba(160,190,240,0.35)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(3 + (122 / 6) * i, 3);
      ctx.lineTo(3 + (122 / 6) * i, 61);
      ctx.stroke();
    }
    for (let j = 1; j < 3; j++) {
      ctx.beginPath();
      ctx.moveTo(3, 3 + (58 / 3) * j);
      ctx.lineTo(125, 3 + (58 / 3) * j);
      ctx.stroke();
    }
    const g = ctx.createLinearGradient(0, 0, 128, 64);
    g.addColorStop(0, "rgba(255,255,255,0.18)");
    g.addColorStop(0.5, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(3, 3, 122, 58);
  });
}

/** façade cell: wall colour with one window (for offices) */
export function windowTexture(wall: string) {
  return canvasTexture(`win-${wall}`, 64, 64, (ctx) => {
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#e8f0fb";
    ctx.fillRect(12, 18, 40, 28);
    ctx.fillStyle = "#9fb7d8";
    ctx.fillRect(15, 21, 34, 22);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillRect(15, 21, 12, 22);
  });
}

/** large framed window with a grid of panes (Hala A) */
export function gridWindowTexture() {
  return canvasTexture("gridwin", 256, 160, (ctx) => {
    ctx.fillStyle = "#eef2f6";
    ctx.fillRect(0, 0, 256, 160);
    const cols = 8;
    const rows = 4;
    const pw = 256 / cols;
    const ph = 160 / rows;
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++) {
        ctx.fillStyle = (c + r) % 3 === 0 ? "#8fa6c4" : "#a9bdd6";
        ctx.fillRect(c * pw + 3, r * ph + 3, pw - 6, ph - 6);
      }
  });
}

/** corrugated cladding look for halls */
export function claddingTexture(wall: string) {
  return canvasTexture(`clad-${wall}`, 32, 32, (ctx) => {
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    ctx.fillRect(0, 0, 3, 32);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(16, 0, 2, 32);
  });
}

export function textTexture(text: string, opts: { color?: string; bg?: string; font?: string; w?: number; h?: number } = {}) {
  const { color = "#ffffff", bg = "transparent", font = "700 64px system-ui, -apple-system, Segoe UI, sans-serif", w = 1024, h = 128 } = opts;
  return canvasTexture(`txt-${text}-${color}-${bg}-${font}-${w}x${h}`, w, h, (ctx) => {
    if (bg !== "transparent") {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2 + 4);
  });
}

/** clone a cached texture with its own repeat */
export function repeated(t: THREE.Texture, rx: number, ry: number) {
  const c = t.clone();
  c.needsUpdate = true;
  c.repeat.set(rx, ry);
  return c;
}
