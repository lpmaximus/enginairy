"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Visualizador em popup para a galeria de /projetos-realizados.
 *
 * Não recebe a lista de fotos por prop de propósito. A página é um Server
 * Component e o grid é renderizado no servidor (bom para SEO e para o
 * primeiro paint); trazer o array para cá obrigaria a marcar a galeria
 * inteira como client. Em vez disso este componente é uma ilha minúscula que
 * escuta o clique por delegação em `a[data-shot]` e lê a lista do próprio DOM
 * no momento do clique — a ordem do popup é sempre a ordem visível na tela.
 *
 * Progressive enhancement: o markup do servidor continua sendo um <a> comum
 * com href e target="_blank". Sem JS (ou antes da hidratação) o clique abre a
 * imagem em aba nova, como antes. Com JS, o preventDefault assume — e Ctrl,
 * Cmd, Shift e botão do meio continuam abrindo em aba, que é o que qualquer
 * um espera de um link.
 */
type Shot = { src: string; caption: string; body: string };

function collect(): Shot[] {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>("a[data-shot]")).map((a) => ({
    src: a.href,
    caption: a.dataset.caption ?? "",
    body: a.dataset.body ?? "",
  }));
}

export default function ShotLightbox() {
  const t = useTranslations("work");
  const [shots, setShots] = useState<Shot[]>([]);
  const [index, setIndex] = useState<number | null>(null);

  const close = useCallback(() => setIndex(null), []);
  const step = useCallback(
    (delta: number) =>
      setIndex((i) => (i === null || shots.length === 0 ? i : (i + delta + shots.length) % shots.length)),
    [shots.length],
  );

  // Abertura por delegação: um único listener para a galeria toda.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>("a[data-shot]");
      if (!link) return;
      event.preventDefault();
      const list = collect();
      setShots(list);
      setIndex(list.findIndex((s) => s.src === link.href));
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Teclado + trava de rolagem do fundo, só enquanto o popup está aberto.
  useEffect(() => {
    if (index === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [index, close, step]);

  if (index === null || !shots[index]) return null;
  const shot = shots[index];

  return (
    <div
      className="eng-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={shot.caption}
      onClick={(e) => {
        // fecha ao clicar no fundo, não na figura
        if (e.target === e.currentTarget) close();
      }}
    >
      <button className="eng-lb-close" type="button" onClick={close} aria-label={t("lightboxClose")}>
        ×
      </button>

      {shots.length > 1 && (
        <button
          className="eng-lb-nav prev"
          type="button"
          onClick={() => step(-1)}
          aria-label={t("lightboxPrev")}
        >
          ‹
        </button>
      )}

      <figure className="eng-lb-figure">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shot.src} alt={shot.caption} />
        <figcaption>
          <h3>{shot.caption}</h3>
          {shot.body && <p>{shot.body}</p>}
          <span className="eng-lb-count">
            {index + 1} / {shots.length}
          </span>
        </figcaption>
      </figure>

      {shots.length > 1 && (
        <button
          className="eng-lb-nav next"
          type="button"
          onClick={() => step(1)}
          aria-label={t("lightboxNext")}
        >
          ›
        </button>
      )}
    </div>
  );
}
