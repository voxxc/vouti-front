export const getGreeting = (): string => {
  const hour = new Date().getHours();
  
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
