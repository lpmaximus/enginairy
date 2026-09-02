"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackPageview, trackCta, CTA_IDS, type CtaId } from "@/src/lib/analytics";

/**
 * Tag do GA4.
 *
 * Duas decisões que não são estéticas:
 *
 * 1. `send_page_view: false`. No App Router a navegação não recarrega a
 *    página; o pageview automático do gtag contaria só a primeira. O disparo
 *    passa a ser manual, no efeito abaixo.
 *
 * 2. `usePathname` e NÃO `useSearchParams`. Ler search params num componente
 *    de layout força a árvore inteira para renderização dinâmica (ou exige
 *    Suspense em volta). O caminho já basta para o relatório de páginas; UTM
 *    o próprio gtag lê de window.location.
 *
 * Sem NEXT_PUBLIC_GA_ID o componente não renderiza nada — dev e preview ficam
 * fora da propriedade de produção sem precisar de flag.
 */
export default function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (!gaId) return;
    // O primeiro pageview sai do próprio config no snippet; repetir aqui
    // duplicaria a sessão de entrada.
    if (first.current) {
      first.current = false;
      return;
    }
    trackPageview(pathname);
  }, [pathname, gaId]);

  /**
   * Delegação de clique para CTAs marcados com `data-cta`.
   *
   * A alternativa seria um onClick em cada botão — o que obrigaria a home
   * inteira (server component) a virar client component só para medir um
   * clique. Com delegação, marcar o CTA custa um atributo no HTML e nada mais.
   *
   * O id é validado contra CTA_IDS: `data-cta` com string errada não vira
   * evento fantasma no GA4, vira aviso no console em dev.
   */
  useEffect(() => {
    if (!gaId) return;
    function onClick(event: MouseEvent) {
      const el = (event.target as HTMLElement | null)?.closest?.("[data-cta]");
      const id = el?.getAttribute("data-cta");
      if (!id) return;
      if (!(CTA_IDS as readonly string[]).includes(id)) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[analytics] data-cta desconhecido: ${id}`);
        }
        return;
      }
      trackCta(id as CtaId);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [gaId]);

  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'granted'
          });
          gtag('js', new Date());
          gtag('config', '${gaId}', { send_page_view: false, anonymize_ip: true });
          gtag('event', 'page_view', { page_path: window.location.pathname });
        `}
      </Script>
    </>
  );
}
