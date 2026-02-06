import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata um número como moeda brasileira (BRL)
 * Exemplo: 2500 -> "R$ 2.500,00"
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Formata um número com separadores brasileiros sem prefixo de moeda
 * Exemplo: 2500 -> "2.500,00"
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0,00';
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
