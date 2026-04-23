import { useEffect } from "react";

const SITE = "PeaceBoard";

export function useDocumentTitle(pageTitle?: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = pageTitle ? `${pageTitle} · ${SITE}` : SITE;
    return () => { document.title = previous; };
  }, [pageTitle]);
}
