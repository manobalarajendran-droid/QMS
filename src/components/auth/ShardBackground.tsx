import { useEffect, useRef } from 'react';

const RESIZE_DEBOUNCE_MS = 150;
const SEED = 11;

/** Small seeded random, so the slabs look the same on every visit. */
function seeded(start: number): () => number {
  let s = start;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function drawShards(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#050506';
  ctx.fillRect(0, 0, w, h);

  const r = seeded(SEED);
  const cell = Math.max(w, h) / 7;
  for (let gy = -1; gy < (h / cell) * 1.6 + 1; gy++) {
    for (let gx = -1; gx < w / cell + 1; gx++) {
      const cx = gx * cell + r() * cell;
      const cy = gy * cell * 0.62 + r() * cell * 0.5;
      const size = cell * (0.55 + r() * 0.6);
      const angle = -0.5 + r() * 0.5;
      const sides = 4 + Math.floor(r() * 2);
      const pts: Array<[number, number]> = [];
      for (let k = 0; k < sides; k++) {
        const t = angle + k * ((Math.PI * 2) / sides) + (r() - 0.5) * 0.5;
        pts.push([cx + Math.cos(t) * size, cy + Math.sin(t) * size * 0.6]);
      }
      const path = (dy: number) => {
        ctx.beginPath();
        pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py + dy) : ctx.moveTo(px, py + dy)));
        ctx.closePath();
      };
      // Dark side face, slightly lower, gives the slab its thickness.
      path(14);
      ctx.fillStyle = '#020203';
      ctx.fill();
      // Lit top face.
      path(0);
      const grey = 18 + Math.floor(r() * 26);
      const grad = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
      grad.addColorStop(0, `rgb(${grey + 14},${grey + 14},${grey + 16})`);
      grad.addColorStop(1, `rgb(${grey - 10},${grey - 10},${grey - 9})`);
      ctx.fillStyle = grad;
      ctx.fill();
      // One bright edge catching the light.
      const e = Math.floor(r() * sides);
      const [x1, y1] = pts[e];
      const [x2, y2] = pts[(e + 1) % sides];
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(255,255,255,${0.25 + r() * 0.55})`;
      ctx.lineWidth = 1 + r() * 2.2;
      ctx.stroke();
      path(0);
      ctx.strokeStyle = 'rgba(255,255,255,.06)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

/** Black 3D slabs with white lit edges, drawn once and on resize. */
export function ShardBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    drawShards(canvas);
    let timer: number | undefined;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => drawShards(canvas), RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="fixed inset-0 z-0 block h-full w-full" />;
}
