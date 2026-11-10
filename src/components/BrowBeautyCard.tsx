import { forwardRef } from "react";

/**
 * Cartão Brow Beauty — preto com rose gold. Desenhado em SVG para ficar
 * idêntico na tela e na imagem que a cliente baixa/compartilha.
 */
export type BrowBeautyCardProps = {
  name: string;
  unlocked: boolean;
  streak: number;
  goal: number;
  memberSince?: string | null | undefined;
  points?: number | undefined;
};

const W = 856;
const H = 540;
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Arial, sans-serif";

function formatMonthYear(dateStr?: string | null) {
  if (!dateStr) return null;
  const [y, m] = dateStr.split("-");
  return `${m}/${y}`;
}

function fitName(name: string) {
  const clean = name.trim().toUpperCase() || "SEU NOME AQUI";
  return clean.length > 26 ? `${clean.slice(0, 25)}…` : clean;
}

export const BrowBeautyCard = forwardRef<SVGSVGElement, BrowBeautyCardProps>(function BrowBeautyCard(
  { name, unlocked, streak, goal, memberSince, points },
  ref,
) {
  const displayName = fitName(name);
  const nameSize = displayName.length > 18 ? 34 : 42;
  const since = formatMonthYear(memberSince);
  const filled = Math.min(streak, goal);

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={`Cartão Brow Beauty de ${name || "cliente"}${unlocked ? "" : `, em conquista: ${filled} de ${goal} meses`}`}
      className="h-auto w-full drop-shadow-[0_25px_45px_rgba(0,0,0,0.35)]"
    >
      <defs>
        <linearGradient id="bb-rose" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F6D7C3" />
          <stop offset="28%" stopColor="#E3A98F" />
          <stop offset="55%" stopColor="#B9786A" />
          <stop offset="78%" stopColor="#ECC0A8" />
          <stop offset="100%" stopColor="#A9675B" />
        </linearGradient>
        <linearGradient id="bb-rose-h" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#B9786A" />
          <stop offset="50%" stopColor="#F6D7C3" />
          <stop offset="100%" stopColor="#B9786A" />
        </linearGradient>
        <radialGradient id="bb-glow" cx="0.85" cy="0.1" r="0.9">
          <stop offset="0%" stopColor="#3A2723" />
          <stop offset="45%" stopColor="#16110F" />
          <stop offset="100%" stopColor="#0A0807" />
        </radialGradient>
        <linearGradient id="bb-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="48%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.07" />
          <stop offset="56%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <clipPath id="bb-clip">
          <rect width={W} height={H} rx="34" />
        </clipPath>
      </defs>

      <g clipPath="url(#bb-clip)">
        <rect width={W} height={H} fill="url(#bb-glow)" />
        {/* Linhas finas decorativas */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={`M ${420 + i * 34} ${H + 20} C ${560 + i * 30} ${330 - i * 10}, ${700 + i * 20} ${180 - i * 14}, ${W + 40} ${120 - i * 18}`}
            fill="none"
            stroke="url(#bb-rose)"
            strokeOpacity={0.1 + i * 0.025}
            strokeWidth="1.2"
          />
        ))}
        <rect width={W} height={H} fill="url(#bb-sheen)" />
      </g>

      {/* Moldura */}
      <rect x="1.5" y="1.5" width={W - 3} height={H - 3} rx="33" fill="none" stroke="url(#bb-rose)" strokeWidth="3" />
      <rect x="22" y="22" width={W - 44} height={H - 44} rx="22" fill="none" stroke="url(#bb-rose)" strokeOpacity="0.35" strokeWidth="1" />

      {/* Emblema: arco da sobrancelha */}
      <g transform="translate(64 66)">
        <path d="M0 34 C 26 6, 70 -4, 112 14 C 96 8, 60 6, 30 22 Z" fill="url(#bb-rose)" />
        <circle cx="122" cy="17" r="3.2" fill="url(#bb-rose)" />
      </g>
      <text x="64" y="136" fill="url(#bb-rose)" fontFamily={SANS} fontSize="19" letterSpacing="6">
        SABRINE BEAUTY
      </text>

      {/* Título */}
      <text x={W - 64} y="96" textAnchor="end" fill="url(#bb-rose)" fontFamily={SERIF} fontSize="46" fontStyle="italic">
        Brow Beauty
      </text>
      <text x={W - 64} y="128" textAnchor="end" fill="#E8C9B8" fillOpacity="0.75" fontFamily={SANS} fontSize="17" letterSpacing="4">
        {unlocked ? "CLIENTE EXCLUSIVA" : "CARTÃO EM CONQUISTA"}
      </text>

      {/* Nome */}
      <text x="64" y="330" fill="url(#bb-rose)" fontFamily={SERIF} fontSize={nameSize} letterSpacing="2">
        {displayName}
      </text>
      <rect x="64" y="350" width="300" height="1.5" fill="url(#bb-rose-h)" opacity="0.7" />

      {/* Rodapé esquerdo */}
      <text x="64" y="420" fill="#E8C9B8" fillOpacity="0.6" fontFamily={SANS} fontSize="16" letterSpacing="3">
        {since ? "CLIENTE DESDE" : "PONTOS"}
      </text>
      <text x="64" y="452" fill="#F3DCCD" fontFamily={SANS} fontSize="30" letterSpacing="2">
        {since ?? String(points ?? 0)}
      </text>
      {since && points !== undefined && (
        <>
          <text x="270" y="420" fill="#E8C9B8" fillOpacity="0.6" fontFamily={SANS} fontSize="16" letterSpacing="3">
            PONTOS
          </text>
          <text x="270" y="452" fill="#F3DCCD" fontFamily={SANS} fontSize="30" letterSpacing="2">
            {points.toLocaleString("pt-BR")}
          </text>
        </>
      )}

      {/* Rodapé direito: selo ou progresso */}
      {unlocked ? (
        <g transform={`translate(${W - 130} 400)`}>
          <circle r="56" fill="none" stroke="url(#bb-rose)" strokeWidth="2" />
          <circle r="47" fill="none" stroke="url(#bb-rose)" strokeOpacity="0.45" strokeWidth="1" />
          <text y="-6" textAnchor="middle" fill="url(#bb-rose)" fontFamily={SERIF} fontSize="30">
            {goal}
          </text>
          <text y="18" textAnchor="middle" fill="#E8C9B8" fontFamily={SANS} fontSize="14" letterSpacing="2">
            MESES
          </text>
        </g>
      ) : (
        <g transform={`translate(${W - 64} 0)`}>
          <text y="420" textAnchor="end" fill="#E8C9B8" fillOpacity="0.6" fontFamily={SANS} fontSize="16" letterSpacing="3">
            {filled} DE {goal} MESES
          </text>
          {Array.from({ length: goal }).map((_, i) => (
            <circle
              key={i}
              cx={-(goal - 1 - i) * 34 - 9}
              cy="448"
              r="9"
              fill={i < filled ? "url(#bb-rose)" : "none"}
              stroke="url(#bb-rose)"
              strokeOpacity={i < filled ? 1 : 0.45}
              strokeWidth="1.5"
            />
          ))}
        </g>
      )}
    </svg>
  );
});

/** Converte o SVG do cartão em PNG (2x) e compartilha ou baixa no aparelho. */
export async function saveCardImage(svg: SVGSVGElement, fileName: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(W));
  clone.setAttribute("height", String(H));
  const xml = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Não foi possível gerar a imagem."));
    img.src = url;
  });

  const scale = 2;
  const pad = 40;
  const canvas = document.createElement("canvas");
  canvas.width = (W + pad * 2) * scale;
  canvas.height = (H + pad * 2) * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível gerar a imagem.");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#F4ECE6";
  ctx.fillRect(0, 0, W + pad * 2, H + pad * 2);
  ctx.drawImage(img, pad, pad, W, H);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Não foi possível gerar a imagem.");
  const file = new File([blob], fileName, { type: "image/png" });

  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "Meu Cartão Brow Beauty" });
      return "shared" as const;
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled" as const;
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return "downloaded" as const;
}
