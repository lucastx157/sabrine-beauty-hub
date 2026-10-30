import { useEffect, useRef, useState } from "react";
import { ArrowRight, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onBook: () => void;
  instagramUrl: string;
  image?: string;
};

type Particles = {
  count: number;
  hx: Float32Array; // posição de origem
  hy: Float32Array;
  dx: Float32Array; // direção da dispersão
  dy: Float32Array;
  t0: Float32Array; // momento em que o pedaço se solta
  sw: Float32Array; // ondulação
  r: Uint8ClampedArray;
  g: Uint8ClampedArray;
  b: Uint8ClampedArray;
  size: number;
};

const BG = { r: 13, g: 10, b: 8 };

function clamp(v: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Abertura cinematográfica: o retrato da Sabrine se desfaz em partículas
 * douradas conforme a página é rolada (efeito "scroll parallax").
 */
export function CinematicHero({ onBook, instagramUrl, image = "/images/sabrine.jpg" }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [headerH, setHeaderH] = useState(0);

  // O cabeçalho fixo fica por cima da abertura, sem cortar a imagem.
  useEffect(() => {
    const measure = () => setHeaderH(document.querySelector("header")?.offsetHeight ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.decoding = "async";
    img.src = image;

    const off = document.createElement("canvas");
    const offCtx = off.getContext("2d")!;
    const maskCanvas = document.createElement("canvas");
    const maskCtx = maskCanvas.getContext("2d")!;
    let buffer: ImageData | null = null;
    let mask: ImageData | null = null;
    let parts: Particles | null = null;
    let rect = { x: 0, y: 0, w: 0, h: 0 };
    let dpr = 1;
    let raf = 0;
    let lastP = -1;
    let alive = true;

    const layout = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      off.width = canvas.width;
      off.height = canvas.height;
      buffer = offCtx.createImageData(off.width, off.height);
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;
      mask = maskCtx.createImageData(maskCanvas.width, maskCanvas.height);

      const W = canvas.width;
      const H = canvas.height;
      const mobile = cw < 768;
      // Área do retrato: tela toda no celular, lado direito no computador.
      const areaX = mobile ? 0 : W * 0.38;
      const areaW = mobile ? W : W * 0.62;
      const scale = Math.max(areaW / img.naturalWidth, H / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      rect = {
        x: areaX + (areaW - w) / 2,
        y: mobile ? Math.min(0, (H - h) * 0.25) : (H - h) / 2,
        w,
        h,
      };
      buildParticles(mobile);
      lastP = -1;
    };

    const buildParticles = (mobile: boolean) => {
      const W = canvas.width;
      const H = canvas.height;
      const sample = document.createElement("canvas");
      sample.width = W;
      sample.height = H;
      const sctx = sample.getContext("2d", { willReadFrequently: true })!;
      sctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
      const data = sctx.getImageData(0, 0, W, H).data;

      const step = Math.max(2, Math.round((mobile ? 3 : 3) * dpr));
      const size = step;
      const x0 = Math.max(0, Math.floor(rect.x));
      const x1 = Math.min(W, Math.ceil(rect.x + rect.w));
      const y0 = Math.max(0, Math.floor(rect.y));
      const y1 = Math.min(H, Math.ceil(rect.y + rect.h));
      const max = Math.ceil(((x1 - x0) / step) * ((y1 - y0) / step));

      const p: Particles = {
        count: 0,
        hx: new Float32Array(max),
        hy: new Float32Array(max),
        dx: new Float32Array(max),
        dy: new Float32Array(max),
        t0: new Float32Array(max),
        sw: new Float32Array(max),
        r: new Uint8ClampedArray(max),
        g: new Uint8ClampedArray(max),
        b: new Uint8ClampedArray(max),
        size,
      };
      const span = Math.max(W, H);
      for (let y = y0; y < y1; y += step) {
        for (let x = x0; x < x1; x += step) {
          const i = (y * W + x) * 4;
          if (data[i + 3]! < 10) continue;
          const k = p.count++;
          p.hx[k] = x;
          p.hy[k] = y;
          p.r[k] = data[i]!;
          p.g[k] = data[i + 1]!;
          p.b[k] = data[i + 2]!;
          // O retrato se desfaz da direita para a esquerda, como poeira ao vento.
          const nx = (x - rect.x) / rect.w;
          const ny = (y - rect.y) / rect.h;
          const noise = Math.random();
          p.t0[k] = clamp((1 - nx) * 0.55 + ny * 0.15 + noise * 0.3);
          const ang = -0.45 + (Math.random() - 0.5) * 1.2;
          const dist = span * (0.06 + Math.random() * 0.3);
          p.dx[k] = Math.cos(ang) * dist;
          p.dy[k] = Math.sin(ang) * dist - span * 0.05;
          p.sw[k] = (Math.random() - 0.5) * span * 0.03;
        }
      }
      parts = p;
    };

    const draw = (pr: number) => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
      if (!parts || !buffer || !mask || pr <= 0.002) return;

      const buf = buffer.data;
      const mbuf = mask.data;
      buf.fill(0);
      mbuf.fill(0);
      const { count, hx, hy, dx, dy, t0, sw, r, g, b, size } = parts;
      const travel = pr * 1.35;
      for (let k = 0; k < count; k++) {
        const local = clamp((travel - t0[k]! * 0.8) / 0.45);
        if (local <= 0) continue;
        const ox = hx[k]! | 0;
        const oy = hy[k]! | 0;
        // Apaga o pedaço da foto que virou poeira.
        for (let yy = 0; yy < size; yy++) {
          if (oy + yy >= H) break;
          let o = ((oy + yy) * W + ox) * 4 + 3;
          for (let xx = 0; xx < size && ox + xx < W; xx++, o += 4) mbuf[o] = 255;
        }
        if (local >= 1) continue;
        const e = local * local * (3 - 2 * local);
        const alpha = 1 - Math.pow(local, 2.2);
        const wob = Math.sin(e * 7 + k) * sw[k]! * e;
        const px = (hx[k]! + dx[k]! * e + wob) | 0;
        const py = (hy[k]! + dy[k]! * e + Math.cos(e * 5 + k) * sw[k]! * e) | 0;
        if (px < 0 || py < 0 || px >= W - size || py >= H - size) continue;
        // Partículas soltas ganham um brilho dourado.
        const gold = Math.min(1, e * 1.4) * 0.8;
        const cr = r[k]! + (240 - r[k]!) * gold;
        const cg = g[k]! + (200 - g[k]!) * gold;
        const cb = b[k]! + (140 - b[k]!) * gold;
        const a = alpha * 255;
        const sz = e > 0.35 ? Math.max(1, size - 1) : size;
        for (let yy = 0; yy < sz; yy++) {
          let o = ((py + yy) * W + px) * 4;
          for (let xx = 0; xx < sz; xx++, o += 4) {
            buf[o] = cr;
            buf[o + 1] = cg;
            buf[o + 2] = cb;
            buf[o + 3] = a;
          }
        }
      }
      maskCtx.putImageData(mask, 0, 0);
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(maskCanvas, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      offCtx.putImageData(buffer, 0, 0);
      ctx.drawImage(off, 0, 0);
    };

    const readProgress = () => {
      const r = section.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      return total > 0 ? clamp(-r.top / total) : 0;
    };

    const tick = () => {
      if (!alive) return;
      const pr = readProgress();
      if (Math.abs(pr - lastP) > 0.0005) {
        lastP = pr;
        draw(pr);
        setProgress(pr);
      }
      raf = requestAnimationFrame(tick);
    };

    const onResize = () => {
      if (!img.complete) return;
      layout();
    };

    img.onload = () => {
      if (!alive) return;
      layout();
      setReady(true);
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("resize", onResize);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [image, reduced]);

  const p = progress;
  const titleOut = clamp((p - 0.28) / 0.17);
  const kickerIn = 1 - clamp(p / 0.08);
  const quoteIn = clamp((p - 0.5) / 0.12) * (1 - clamp((p - 0.8) / 0.1));
  const ctaIn = clamp((p - 0.66) / 0.14);

  return (
    <section
      ref={sectionRef}
      aria-label="Sabrine Beauty"
      className="cinematic-hero relative"
      style={{ height: reduced ? "100svh" : "300svh", marginTop: -headerH, backgroundColor: `rgb(${BG.r},${BG.g},${BG.b})` }}
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        {/* Imagem de reserva enquanto o efeito carrega (e para quem prefere sem animação). */}
        <img
          src={image}
          alt="Sabrine, especialista em design de sobrancelhas"
          className="absolute inset-0 h-full w-full object-cover object-[50%_25%] transition-opacity duration-700 md:left-[38%] md:w-[62%]"
          style={{ opacity: ready && !reduced ? 0 : 1 }}
          fetchPriority="high"
        />
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
        <div className="cinematic-scrim pointer-events-none absolute inset-0" />
        <div className="cinematic-grain pointer-events-none absolute inset-0" />

        <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col justify-end px-6 pb-28 text-[#F4EDE4] md:justify-center md:px-10 md:pb-0">
          <div
            style={{
              opacity: 1 - titleOut,
              transform: `translateY(${-titleOut * 60}px)`,
              filter: `blur(${titleOut * 6}px)`,
            }}
          >
            <p className="mb-6 text-xs uppercase tracking-[0.3em] text-[#C5A36B]">
              Design de sobrancelhas &amp; estética
            </p>
            <h1 className="font-serif text-6xl leading-[0.95] md:text-8xl lg:text-9xl">
              Sabrine
              <br />
              <span className="italic text-[#E8C48C]">Beauty</span>
            </h1>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-[#F4EDE4]/80 md:text-lg">
              A essência do olhar perfeito.
            </p>
          </div>

          <div
            className="absolute inset-x-6 bottom-1/2 translate-y-1/2 md:inset-x-10 md:max-w-xl"
            style={{ opacity: quoteIn, transform: `translateY(${(1 - quoteIn) * 30}px)` }}
            aria-hidden={quoteIn < 0.5}
          >
            <p className="font-serif text-3xl italic leading-snug md:text-5xl">
              Cada traço, desenhado para o seu rosto.
            </p>
            <p className="mt-4 text-sm text-[#F4EDE4]/70 md:text-base">
              Técnica exclusiva Sabrine para sobrancelhas e lábios.
            </p>
          </div>

          <div
            className="absolute inset-x-6 bottom-14 md:inset-x-10 md:bottom-20"
            style={{ opacity: reduced ? 1 : ctaIn, transform: `translateY(${(1 - (reduced ? 1 : ctaIn)) * 30}px)`, pointerEvents: ctaIn > 0.5 || reduced ? "auto" : "none" }}
          >
            <div className="flex flex-wrap items-center gap-4">
              <Button size="lg" className="h-12 bg-[#E8C48C] px-7 text-[#171412] hover:bg-[#F4EDE4]" onClick={onBook}>
                Agendar agora <ArrowRight />
              </Button>
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 text-sm text-[#F4EDE4] underline underline-offset-4"
              >
                <Instagram className="h-4 w-4" /> Ver no Instagram
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 border-t border-[#F4EDE4]/20 pt-5 text-xs text-[#F4EDE4]/75 md:text-sm">
              <span>+6 mil atendimentos</span>
              <span>Especialista certificada</span>
              <span>Premiada em Minas Gerais</span>
            </div>
          </div>
        </div>

        {!reduced && (
          <div
            className="pointer-events-none absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#F4EDE4]/70"
            style={{ opacity: kickerIn }}
          >
            Role para descobrir
            <span className="cinematic-scroll-line block h-10 w-px bg-[#F4EDE4]/60" />
          </div>
        )}
      </div>

      <style>{`
        .cinematic-scrim {
          background:
            linear-gradient(90deg, rgba(13,10,8,.96) 0%, rgba(13,10,8,.9) 36%, rgba(13,10,8,.35) 52%, rgba(13,10,8,0) 66%),
            linear-gradient(0deg, rgba(13,10,8,.85) 0%, rgba(13,10,8,0) 30%),
            linear-gradient(180deg, rgba(13,10,8,.5) 0%, rgba(13,10,8,0) 18%);
        }
        @media (max-width: 767px) {
          .cinematic-scrim {
            background: linear-gradient(0deg, rgba(13,10,8,.95) 0%, rgba(13,10,8,.55) 45%, rgba(13,10,8,.1) 75%);
          }
        }
        .cinematic-grain {
          opacity: .07;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .cinematic-scroll-line { transform-origin: top; animation: cinematic-line 1.8s ease-in-out infinite; }
        @keyframes cinematic-line { 0% { transform: scaleY(0); } 50% { transform: scaleY(1); } 100% { transform: scaleY(0); transform-origin: bottom; } }
      `}</style>
    </section>
  );
}
