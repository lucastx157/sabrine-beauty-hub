import { BadgeCheck } from "lucide-react";

/** Selo exibido sobre fotos de atendimentos feitos pela própria Sabrine. */
export function RealPhotoSeal({ className = "" }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#171412]/85 px-3 py-1.5 text-[11px] font-semibold leading-none text-white shadow-md backdrop-blur-sm ${className}`}
    >
      <BadgeCheck className="h-3.5 w-3.5 text-[#C5A36B]" aria-hidden="true" />
      Foto real · feito pela Sabrine
    </span>
  );
}

/** Fotos próprias da Sabrine ficam em /images/procedure-*. */
export function isRealPhoto(src?: string) {
  return !!src && src.startsWith("/images/procedure-");
}
