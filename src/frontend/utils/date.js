export function toLocaleStringBR(date) {
  return new Date(date).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo'
  });
}

export function formatDateBR(date) {
  return new Date(date).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo'
  });
}

export function getBrasiliaDateTime() {
  const now = new Date();
  now.setHours(now.getHours() - 3);
  return now.toISOString().replace('T', ' ').slice(0, 19);
}
