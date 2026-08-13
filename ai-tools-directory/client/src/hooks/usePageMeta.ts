/* Style reminder: metadata-only hook; keep route SEO content Arabic, explicit, and free of visual side effects. */
import { useEffect } from "react";

const SITE_NAME = "دليل الأدوات";
const CANONICAL_ORIGIN = "https://aitoosdir-gdrh7zh3.manus.space";

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? title : `${title} — ${SITE_NAME}`;
    document.title = fullTitle;

    const descriptionTag = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    descriptionTag?.setAttribute("content", description);

    const ogTitle = document.querySelector<HTMLMetaElement>(
      'meta[property="og:title"]'
    );
    ogTitle?.setAttribute("content", fullTitle);

    const ogDescription = document.querySelector<HTMLMetaElement>(
      'meta[property="og:description"]'
    );
    ogDescription?.setAttribute("content", description);

    const canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    );
    const pathname =
      window.location.pathname === "/" ? "/" : window.location.pathname;
    canonical?.setAttribute("href", `${CANONICAL_ORIGIN}${pathname}`);

    const ogUrl = document.querySelector<HTMLMetaElement>(
      'meta[property="og:url"]'
    );
    ogUrl?.setAttribute("content", `${CANONICAL_ORIGIN}${pathname}`);
  }, [description, title]);
}
