import { useEffect, useRef } from "react";

type Chapter = {
  mark: string; // texto grande e translúcido ao fundo
  label: string; // data ou fase
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
    mark: "Infância",
    label: "Infância",
    title: "A menina que vendia sonhos",
    text: "Com uns 8 anos, ganhou uma caixinha de bijuterias e o primeiro pensamento foi vender. Vendia cada uma a 50 centavos. Depois foi sacoleira, vendeu lingerie, vendeu bombons na rua e fez bolos de festa.",
    img: `${IMG}/cap-1.jpg`,
    alt: "Sabrine ainda criança, dançando",
  },
  {
    mark: "Início",
    label: "O começo",
    title: "O começo na garagem",
    text: "Um dia decidiu mudar completamente o caminho e empreender na área da beleza. Ainda não tinha nem estúdio, trabalhava na garagem de casa, mas tinha sonhos e uma promessa de Deus.",
    img: `${IMG}/cap-2.jpg`,
    alt: "Sabrine no início da carreira, em frente à placa Sabrine Sobrancelhas",
  },
  {
    mark: "2019",
    label: "2019",
    title: "Asas para voar",
    text: "Especialização em micropigmentação fio a fio e as primeiras feiras e eventos da área.",
    img: `${IMG}/cap-3.jpg`,
    alt: "Sabrine em um evento de beleza, diante de um painel com asas",
  },
  {
    mark: "2020",
    label: "Março de 2020",
    title: "Representando a cidade",
    text: "Escolhida para representar Santo Antônio do Monte no evento Empreendedoras Mineiras.",
    img: `${IMG}/cap-4.jpg`,
    alt: "Convite do evento Empreendedoras Mineiras com a foto de Sabrine",
    gallery: [{ src: `${IMG}/cap-4b.jpg`, alt: "Certificado do Prêmio Empreendedoras Mineiras" }],
  },
  {
    mark: "2020",
    label: "Junho de 2020",
    title: "Micropigmentadora Destaque 2020",
    text: "Reconhecida como Micropigmentadora Destaque 2020 em Minas Gerais.",
    img: `${IMG}/cap-5.jpg`,
    alt: "Arte do Prêmio Beauty Minas com a foto de Sabrine",
    award: true,
  },
  {
    mark: "2020",
    label: "Novembro de 2020",
    title: "Top of Mind Brasil",
    text: "A mais votada na sua categoria no Prêmio Top of Mind Brasil.",
    img: `${IMG}/cap-6.jpg`,
    alt: "Sabrine com o selo do Prêmio Top of Mind Brasil",
    award: true,
  },
  {
    mark: "2021",
    label: "Agosto de 2021",
    title: "Prêmio Empreendedora Mineira",
    text: "Desde criança, sonhadora e cheia de planos. O prêmio que reconhece toda essa caminhada de empreendedora.",
    img: `${IMG}/cap-7.jpg`,
    alt: "Sabrine segurando o troféu do Prêmio Empreendedora Mineira",
    award: true,
  },
  {
    mark: "2022",
    label: "Agosto de 2022",
    title: "Beauty Stars, Belo Horizonte",
    text: "Mais um ano recebendo o prêmio. “O caminho foi longo, às vezes doloroso, mas é por vocês essa conquista.”",
    img: `${IMG}/cap-8.jpg`,
    alt: "Troféu Beauty Stars na mão de Sabrine",
    award: true,
  },
  {
    mark: "2023",
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
    mark: "Hoje",
    label: "Hoje",
    title: "Sabrine Beauty",
    text: "Mais de 10 anos de profissão e mais de 6 mil atendimentos. Hoje, Sabrine compartilha o que aprendeu e transforma vidas através do olhar.",
    img: `${IMG}/cap-10.jpg`,
    alt: "Sabrine no estúdio Sabrine Beauty",
  },
];

function Trophy() {
  return (
    <span className="traj-seal" aria-label="Prêmio">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path
          fill="currentColor"
          d="M7 3h10v2h3v3a5 5 0 0 1-4.1 4.9A5 5 0 0 1 13 15.9V18h3v3H8v-3h3v-2.1A5 5 0 0 1 8.1 12.9 5 5 0 0 1 4 8V5h3V3Zm0 4H6v1a3 3 0 0 0 1 2.2V7Zm10 0v3.2A3 3 0 0 0 18 8V7h-1Z"
        />
      </svg>
      Prêmio
    </span>
  );
}

export function Trajetoria({ onBook }: { onBook: () => void }) {
  const root = useRef<HTMLElement>(null);
  const line = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) e.target.classList.add("is-in");
      },
      { threshold: 0.25 },
    );
    items.forEach((i) => io.observe(i));

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / r.height));
        line.current?.style.setProperty("--p", String(p));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section id="trajetoria" ref={root} className="traj" aria-labelledby="traj-title">
      <div className="traj-grain" aria-hidden="true" />

      <header className="traj-open">
        <div className="traj-bar" aria-hidden="true" />
        <div className="traj-open-inner" data-reveal>
          <p className="traj-kick">Sabrine Beauty</p>
          <h2 id="traj-title" className="traj-title">
            Minha Trajetória
          </h2>
          <p className="traj-sub">Uma história de fé, trabalho e coragem</p>
        </div>
        <div className="traj-bar" aria-hidden="true" />
      </header>

      <div className="traj-chapters">
        <div ref={line} className="traj-line" aria-hidden="true" />
        {CHAPTERS.map((c, i) => (
          <article key={c.title} className={`traj-ch ${i % 2 ? "is-alt" : ""}`} data-reveal>
            <span className="traj-mark" aria-hidden="true">
              {c.mark}
            </span>
            <span className="traj-dot" aria-hidden="true" />
            <figure className="traj-fig">
              <div className="traj-pic">
                <img src={c.img} alt={c.alt} loading="lazy" decoding="async" />
              </div>
              {c.gallery && (
                <div className="traj-gallery">
                  {c.gallery.map((g) => (
                    <img key={g.src} src={g.src} alt={g.alt} loading="lazy" decoding="async" />
                  ))}
                </div>
              )}
            </figure>
            <div className="traj-copy">
              <p className="traj-label">
                {c.label}
                {c.award && <Trophy />}
              </p>
              <h3 className="traj-h">{c.title}</h3>
              <p className="traj-text">{c.text}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="traj-end" data-reveal>
        <p className="traj-sub">A próxima página dessa história pode ter o seu olhar.</p>
        <button type="button" onClick={onBook} className="traj-cta">
          Agende seu horário
        </button>
      </div>
    </section>
  );
}
