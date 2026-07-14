/**
 * Formata datas de forma segura para o portal.
 * Resolve o problema de datas "31/12/1969" originadas do banco de dados (Directus),
 * ignorando datas que caem no Unix Epoch (1969/1970) e tratando datas nulas.
 */
export function safeFormatDate(
  dateStr: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateStr) return '';

  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  
  if (isNaN(date.getTime())) return ''; // Data inválida

  // Proteção contra Unix Epoch (bad data comum em bancos de dados/APIs como "1970-01-01" ou 0)
  // No fuso horário do Brasil (UTC-3), isso aparece como 31/12/1969.
  const year = date.getFullYear();
  if (year === 1969 || year === 1970) {
    return ''; // Retorna string vazia para ocultar datas fantasmas
  }

  return date.toLocaleDateString('pt-BR', options);
}
