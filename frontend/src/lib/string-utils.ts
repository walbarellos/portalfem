/**
 * Utilitários para strings.
 */

/**
 * Remove todas as tags HTML de uma string, mantendo apenas o texto puro.
 * Útil para exibir resumos e descrições em cards (onde HTML quebraria o layout)
 * ou em meta tags (SEO).
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
}
