export const getGreeting = (): string => {
  // Use Brasilia timezone (America/Sao_Paulo)
  const now = new Date();
  const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const hour = brasiliaTime.getHours();
  
  if (hour >= 6 && hour < 12) {
    return 'Bom dia';
  } else if (hour >= 12 && hour < 18) {
    return 'Boa tarde';
  } else {
    return 'Boa noite';
  }
};

export const getFullGreeting = (userName: string): string => {
  const firstName = userName.split(' ')[0];
  return `Olá ${firstName}, ${getGreeting()}`;
};
