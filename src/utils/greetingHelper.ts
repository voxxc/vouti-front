export const getGreeting = (): string => {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) {
    return 'bom dia';
  } else if (hour >= 12 && hour < 18) {
    return 'boa tarde';
  } else {
    return 'boa noite';
  }
};

export const getFullGreeting = (userName: string): string => {
  return `Olá ${userName}, ${getGreeting()}`;
};
