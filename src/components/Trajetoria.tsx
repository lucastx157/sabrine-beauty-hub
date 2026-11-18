import { Fragment, useEffect, useRef, useState } from "react";

type Chapter = {
  label: string;
  title: string;
  text: string;
  img: string;
  alt: string;
  award?: boolean;
  gallery?: { src: string; alt: string }[];
};

const IMG = "/images/trajetoria";

const CHAPTERS: Chapter[] = [
  {
    label: "Infância",
    title: "A menina que vendia sonhos",
    text: "Com uns 8 anos, ganhou uma caixinha de bijuterias e o primeiro pensamento foi vender. Vendia cada uma a 50 centavos. Depois foi sacoleira, vendeu lingerie, vendeu bombons na rua e fez bolos de festa.",
    img: `${IMG}/cap-1.jpg`,
    alt: "Sabrine em uma de suas primeiras fotos no Instagram",
  },
  {
    label: "O começo",
    title: "O começo na garagem",
    text: "Um dia decidiu mudar completamente o caminho e empreender na área da beleza. Ainda não tinha nem estúdio, trabalhava na garagem de casa, mas tinha sonhos e uma promessa de Deus.",
    img: `${IMG}/cap-2.jpg`,
    alt: "Sabrine no início da carreira, em frente à placa Sabrine Sobrancelhas",
  },
  {
    label: "2019",
    title: "Asas para voar",
    text: "Especialização em micropigmentação fio a fio e as primeiras feiras e eventos da área.",
    img: `${IMG}/cap-3.jpg`,
    alt: "Sabrine em um evento de beleza, diante de um painel com asas",
  },
  {
    label: "Março de 2020",
    title: "Representando a cidade",
    text: "Escolhida para representar Santo Antônio do Monte no evento Empreendedoras Mineiras.",
    img: `${IMG}/cap-4.jpg`,
    alt: "Convite do evento Empreendedoras Mineiras com a foto de Sabrine",
    gallery: [{ src: `${IMG}/cap-4b.jpg`, alt: "Certificado do Prêmio Empreendedoras Mineiras" }],
  },
  {
    label: "Junho de 2020",
    title: "Micropigmentadora Destaque 2020",
    text: "Reconhecida como Micropigmentadora Destaque 2020 em Minas Gerais.",
    img: `${IMG}/cap-5.jpg`,
    alt: "Arte do Prêmio Beauty Minas com a foto de Sabrine",
    award: true,
  },
  {
    label: "Novembro de 2020",
    title: "Top of Mind Brasil",
    text: "A mais votada na sua categoria no Prêmio Top of Mind Brasil.",
    img: `${IMG}/cap-6.jpg`,
    alt: "Sabrine com o selo do Prêmio Top of Mind Brasil",
    award: true,
  },
  {
    label: "Agosto de 2021",
    title: "Prêmio Empreendedora Mineira",
    text: "Desde criança, sonhadora e cheia de planos. O prêmio que reconhece toda essa caminhada de empreendedora.",
    img: `${IMG}/cap-7.jpg`,
    alt: "Sabrine segurando o troféu do Prêmio Empreendedora Mineira",
    award: true,
  },
  {
    label: "Agosto de 2022",
    title: "Beauty Stars, Belo Horizonte",
    text: "Mais um ano recebendo o prêmio. “O caminho foi longo, às vezes doloroso, mas é por vocês essa conquista.”",
    img: `${IMG}/cap-8.jpg`,
    alt: "Troféu Beauty Stars na mão de Sabrine",
    award: true,
  },
  {
    label: "Novembro de 2023",
    title: "Mais uma vitória",
    text: "“Quantos caminhos, quantas pontes quebradas, quantas tempestades, mas também quantas vitórias.”",
    img: `${IMG}/cap-9.jpg`,
    alt: "Sabrine no palco do Beauty Stars",
    award: true,
    gallery: [
      { src: `${IMG}/cap-9b.jpg`, alt: "Sabrine de vestido lilás em evento" },
      { src: `${IMG}/cap-9c.jpg`, alt: "Sabrine ao ar livre" },
    ],
  },
  {
    label: "Hoje",
    title: "Sabrine Beauty",
    text: "Mais de 10 anos de profissão e mais de 6 mil atendimentos. Hoje, Sabrine compartilha o que aprendeu e transforma vidas através do olhar.",
    img: `${IMG}/cap-10.jpg`,
    alt: "Sabrine no estúdio Sabrine Beauty",
  },
];

function Trophy() {
  return (
    <span className="traj-seal">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
        <path
          fill="currentColor"
          d="M7 3h10v2h3v3a5 5 0 0 1-4.1 4.9A5 5 0 0 1 13 15.9V18h3v3H8v-3h3v-2.1A5 5 0 0 1 8.1 12.9 5 5 0 0 1 4 8V5h3V3Zm0 4H6v1a3 3 0 0 0 1 2.2V7Zm10 0v3.2A3 3 0 0 0 18 8V7h-1Z"
        />
      </svg>
      Prêmio
    </span>
  );
}

function Corners() {
  return (
    <>
      {(["tl", "tr", "bl", "br"] as const).map((c) => (
        <img key={c} className={`altar-corner ${c}`} src={`${IMG}/ornament-corner.svg`} alt="" aria-hidden="true" />
      ))}
    </>
  );
}

/** Versão sem movimento: lista vertical simples, para quem pede "reduzir movimento". */
function StaticList({ onBook }: { onBook: () => void }) {
  return (
    <section id="trajetoria" className="traj-static" aria-labelledby="traj-title">
      <header className="traj-static-head">
        <h2 id="traj-title">Minha Trajetória</h2>
        <p>Uma história de fé, trabalho e coragem</p>
      </header>
      <ol>
        {CHAPTERS.map((c) => (
          <li key={c.title}>
            <img src={c.img} alt={c.alt} loading="lazy" decoding="async" />
            <div>
              <p className="cap-label">
                {c.label}
                {c.award && <Trophy />}
              </p>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="traj-static-end">
        <button type="button" onClick={onBook} className="castle-cta">
          Agende seu horário
        </button>
      </div>
    </section>
  );
}

const N = CHAPTERS.length;
const D = 1100; // distância entre um altar e o próximo (px)
const DOOR_PHASE = 0.08; // parte inicial da rolagem em que os portões se abrem
const SEGMENTS = Array.from({ length: N + 1 }, (_, k) => k + 1); // trechos do corredor

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function PalaceFull({ onBook }: { onBook: () => void }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);
  const [active, setActive] = useState(-1);
  const [phase, setPhase] = useState<"doors" | "hall" | "end">("doors");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const el = root.current;
    const st = stage.current;
    const w = world.current;
    if (!el || !st || !w) return;
    const parts = Array.from(w.querySelectorAll<HTMLElement>("[data-k]")).map((node) => ({
      node,
      k: Number(node.dataset["k"]),
      plane: node.dataset["plane"] === "1",
      fade: node.dataset["fade"] !== "0",
    }));
    let raf = 0;
    const cam0 = 0.2 * D; // câmera parada diante do portão
    const start = 0.32 * D;
    const total = (N + 0.6) * D;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      const open = clamp(p / DOOR_PHASE, 0, 1);
      const walk = clamp((p - DOOR_PHASE) / (1 - DOOR_PHASE), 0, 1);
      const ease = open * open * (3 - 2 * open);
      const cam = open < 1 ? cam0 + ease * (start - cam0) : start + walk * (total - start);
      const u = cam / D;
      st.style.setProperty("--open", ease.toFixed(3));
      w.style.transform = `translate3d(0,0,${cam.toFixed(1)}px)`;
      for (const part of parts) {
        const dist = part.k - u;
        const hidden = part.plane ? dist < -0.02 : dist < -0.65;
        part.node.style.visibility = hidden || dist > 5.2 ? "hidden" : "visible";
        if (part.fade) part.node.style.opacity = clamp(1.25 - dist * 0.24, 0, 1).toFixed(3);
      }
      const idx = Math.ceil(u + 0.1) - 1; // altar que está logo à frente
      setActive(open < 1 ? -1 : clamp(idx, 0, N - 1));
      setPhase(open < 1 ? "doors" : walk > 0.965 ? "end" : "hall");
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  if (reduced) return <StaticList onBook={onBook} />;

  const c = active >= 0 ? CHAPTERS[active] : null;
  const side = active % 2 ? "right" : "left";

  return (
    <section
      id="trajetoria"
      ref={root}
      className="castle"
      style={{ height: `${(N + 2) * 100}svh` }}
      aria-labelledby="traj-title"
    >
      <div ref={stage} className="castle-stage">
        <div className="castle-view" aria-hidden="true">
          <div ref={world} className="castle-world">
            {SEGMENTS.map((k) => {
              const z = -k * D;
              return (
                <Fragment key={`seg-${k}`}>
                  <div data-k={k} className="hall-floor" style={{ transform: `translate(-50%,-50%) translate3d(0,var(--hh),${z}px) rotateX(90deg)` }} />
                  <div data-k={k} className="hall-ceiling" style={{ transform: `translate(-50%,-50%) translate3d(0,calc(var(--hh) * -1),${z}px) rotateX(-90deg)` }} />
                  <div data-k={k} className="hall-wall" style={{ transform: `translate(-50%,-50%) translate3d(calc(var(--hw) * -1),0,${z}px) rotateY(90deg)` }} />
                  <div data-k={k} className="hall-wall" style={{ transform: `translate(-50%,-50%) translate3d(var(--hw),0,${z}px) rotateY(-90deg)` }} />
                  <div data-k={k} data-plane="1" className="hall-lustre" style={{ transform: `translate(-50%,-50%) translate3d(0,calc(var(--hh) * -1 + var(--lustre-y)),${z}px)` }} />
                  {k > 1 && (
                    <div data-k={k - 0.5} data-plane="1" className="hall-arch" style={{ transform: `translate(-50%,-50%) translate3d(0,0,${z + D / 2}px)` }} />
                  )}
                </Fragment>
              );
            })}

            {CHAPTERS.map((ch, i) => {
              const right = i % 2 === 1;
              const x = right ? "calc(var(--hw) - var(--ax))" : "calc(var(--hw) * -1 + var(--ax))";
              return (
                <div
                  key={ch.title}
                  data-k={i + 1}
                  data-plane="1"
                  className={`altar ${i === active ? "is-active" : ""}`}
                  style={{ transform: `translate(-50%,-100%) translate3d(${x},var(--hh),${-(i + 1) * D}px) rotateY(${right ? -38 : 38}deg)` }}
                >
                  <div className="altar-light" />
                  <div className="altar-frame">
                    <Corners />
                    <img src={ch.img} alt="" loading={i < 2 ? "eager" : "lazy"} decoding="async" />
                    {ch.award && <span className="altar-award">Prêmio</span>}
                  </div>
                  <div className="altar-base">
                    <span>{ch.label}</span>
                  </div>
                </div>
              );
            })}

            <div data-k={N + 1.4} className="hall-end" style={{ transform: `translate(-50%,-50%) translate3d(0,0,${-(N + 1.5) * D}px)` }}>
              <span className="hall-end-mono">S</span>
            </div>

            <div data-k={0.5} data-plane="1" data-fade="0" className="castle-gate" style={{ transform: `translate(-50%,-50%) translate3d(0,0,${-D / 2}px)` }}>
              <div className="door left" />
              <div className="door right" />
            </div>
          </div>
        </div>

        <div className="castle-vignette" aria-hidden="true" />

        <div className="castle-title" aria-hidden={phase !== "doors"}>
          <p className="castle-kick">Sabrine Beauty</p>
          <h2 id="traj-title">Minha Trajetória</h2>
          <p className="castle-sub">Uma história de fé, trabalho e coragem</p>
          <p className="castle-hint">Role a tela para entrar</p>
        </div>

        <div className={`castle-caption side-${side} ${c && phase === "hall" ? "is-on" : ""}`} aria-hidden="true">
          {c && (
            <div key={c.title} className="castle-caption-inner">
              <p className="cap-label">
                {c.label}
                {c.award && <Trophy />}
              </p>
              <h3>{c.title}</h3>
              <p className="cap-text">{c.text}</p>
              {c.gallery && (
                <div className="cap-gallery">
                  {c.gallery.map((g) => (
                    <img key={g.src} src={g.src} alt="" loading="lazy" decoding="async" />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`castle-end ${phase === "end" ? "is-on" : ""}`}>
          <p className="castle-sub">A próxima página dessa história pode ter o seu olhar.</p>
          <button type="button" onClick={onBook} className="castle-cta" tabIndex={phase === "end" ? 0 : -1}>
            Agende seu horário
          </button>
        </div>
      </div>

      {/* Conteúdo completo para leitores de tela */}
      <div className="sr-only">
        <ol>
          {CHAPTERS.map((ch) => (
            <li key={ch.title}>
              <h3>
                {ch.label}: {ch.title}
              </h3>
              <p>{ch.text}</p>
              <img src={ch.img} alt={ch.alt} loading="lazy" />
            </li>
          ))}
        </ol>
        <button type="button" onClick={onBook}>
          Agende seu horário
        </button>
      </div>
    </section>
  );
}

/* ===================== Versão leve (celular) =====================
   Um único fundo pré-desenhado do corredor que "avança" por zoom (o desenho é
   auto-semelhante: cada arco é 1,6x o seguinte, então o zoom fecha o ciclo sem
   emenda) e só 2–3 altares visíveis por vez, movidos apenas com transform. */
const R = 1.6; // razão de escala entre arcos consecutivos no fundo
const S1 = 0.53; // escala do 1º arco no desenho
const BG_W = 430;
const BG_H = 932;
const VP_Y = 0.4; // ponto de fuga (40% da altura)

function PalaceLite({ onBook }: { onBook: () => void }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const bg = useRef<HTMLImageElement>(null);
  const altars = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(-1);
  const [phase, setPhase] = useState<"doors" | "hall" | "end">("doors");

  useEffect(() => {
    const el = root.current;
    const st = stage.current;
    const img = bg.current;
    if (!el || !st || !img) return;
    let raf = 0;
    let vw = 0;
    let vh = 0;
    let g = 1;
    const measure = () => {
      vw = st.clientWidth;
      vh = st.clientHeight;
      g = Math.max(vw / BG_W, vh / BG_H);
      img.style.width = `${BG_W * g}px`;
      img.style.height = `${BG_H * g}px`;
      img.style.left = `${vw / 2 - (BG_W * g) / 2}px`;
      img.style.top = `${VP_Y * vh - VP_Y * BG_H * g}px`;
    };
    const update = () => {
      const r = el.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      const doorEnd = 0.09;
      const open = clamp(p / doorEnd, 0, 1);
      const walk = clamp((p - doorEnd) / (1 - doorEnd), 0, 1);
      const ease = open * open * (3 - 2 * open);
      const v = open < 1 ? ease * 0.5 : 0.5 + walk * (N + 0.7);
      st.style.setProperty("--open", ease.toFixed(3));
      const frac = v - Math.floor(v);
      img.style.transform = `scale(${Math.pow(R, frac).toFixed(4)})`;
      for (let i = 0; i < N; i++) {
        const a = altars.current[i];
        if (!a) continue;
        const n = i + 1.5 - v; // posição relativa em "arcos" à frente
        if (n < -1.6 || n > 3.2) {
          a.style.visibility = "hidden";
          continue;
        }
        const sg = S1 * Math.pow(R, -n) * g;
        const x = vw / 2 + (i % 2 ? 135 : -135) * sg;
        const y = VP_Y * vh + 440 * sg;
        a.style.visibility = "visible";
        a.style.opacity = clamp(3.2 - n, 0, 1).toFixed(3);
        a.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${sg.toFixed(4)}) perspective(900px) rotateY(${i % 2 ? -32 : 32}deg) translate(-50%,-100%)`;
      }
      setActive(open < 1 ? -1 : clamp(Math.floor(v - 1), 0, N - 1));
      setPhase(open < 1 ? "doors" : v > N + 0.95 ? "end" : "hall");
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  const c = active >= 0 ? CHAPTERS[active] : null;

  return (
    <section
      id="trajetoria"
      ref={root}
      className="castle castle-lite"
      style={{ height: `${Math.round(N * 90 + 200)}svh` }}
      aria-labelledby="traj-title"
    >
      <div ref={stage} className="castle-stage">
        <div className="lite-view" aria-hidden="true">
          <img ref={bg} className="lite-bg" src={`${IMG}/corredor.webp`} alt="" decoding="async" fetchPriority="low" />
          <div className="lite-depth" />
          {CHAPTERS.map((ch, i) => (
            <div
              key={ch.title}
              ref={(node) => {
                altars.current[i] = node;
              }}
              className="altar lite-altar"
              style={{ zIndex: N - i }}
            >
              <div className="altar-frame">
                <Corners />
                <img src={ch.img} alt="" loading="lazy" decoding="async" />
                {ch.award && <span className="altar-award">Prêmio</span>}
              </div>
              <div className="altar-base">
                <span>{ch.label}</span>
              </div>
            </div>
          ))}
          <div className="lite-doors">
            <div className="door left" />
            <div className="door right" />
          </div>
        </div>

        <div className="castle-vignette" aria-hidden="true" />

        <div className="castle-title" aria-hidden={phase !== "doors"}>
          <p className="castle-kick">Sabrine Beauty</p>
          <h2 id="traj-title">Minha Trajetória</h2>
          <p className="castle-sub">Uma história de fé, trabalho e coragem</p>
          <p className="castle-hint">Role a tela para entrar</p>
        </div>

        <div className={`castle-caption ${c && phase === "hall" ? "is-on" : ""}`} aria-hidden="true">
          {c && (
            <div key={c.title} className="castle-caption-inner">
              <p className="cap-label">
                {c.label}
                {c.award && <Trophy />}
              </p>
              <h3>{c.title}</h3>
              <p className="cap-text">{c.text}</p>
            </div>
          )}
        </div>

        <div className={`castle-end ${phase === "end" ? "is-on" : ""}`}>
          <p className="castle-sub">A próxima página dessa história pode ter o seu olhar.</p>
          <button type="button" onClick={onBook} className="castle-cta" tabIndex={phase === "end" ? 0 : -1}>
            Agende seu horário
          </button>
        </div>
      </div>

      <div className="sr-only">
        <ol>
          {CHAPTERS.map((ch) => (
            <li key={ch.title}>
              <h3>
                {ch.label}: {ch.title}
              </h3>
              <p>{ch.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Escolhe a versão: lista simples (reduzir movimento), leve (celular/tablet) ou 3D completa (computador). */
export function Trajetoria({ onBook }: { onBook: () => void }) {
  const [mode, setMode] = useState<"lite" | "full" | "static">("lite");
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desk = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const pick = () => setMode(reduce.matches ? "static" : desk.matches ? "full" : "lite");
    pick();
    reduce.addEventListener("change", pick);
    desk.addEventListener("change", pick);
    return () => {
      reduce.removeEventListener("change", pick);
      desk.removeEventListener("change", pick);
    };
  }, []);
  if (mode === "static") return <StaticList onBook={onBook} />;
  if (mode === "full") return <PalaceFull onBook={onBook} />;
  return <PalaceLite onBook={onBook} />;
}
