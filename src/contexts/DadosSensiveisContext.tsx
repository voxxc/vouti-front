import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DadosSensiveisContextType {
  dadosVisiveis: boolean;
  toggleDadosVisiveis: () => void;
  formatarValor: (valor: number) => string;
  formatarNumero: (numero: number) => string;
  formatarPorcentagem: (valor: number) => string;
  formatarTexto: (texto: string, maxLength?: number) => string;
}

const DadosSensiveisContext = createContext<DadosSensiveisContextType | undefined>(undefined);

const STORAGE_KEY = 'vouti-dados-visiveis';

export const DadosSensiveisProvider = ({ children }: { children: ReactNode }) => {
  const [dadosVisiveis, setDadosVisiveis] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(dadosVisiveis));
  }, [dadosVisiveis]);

  const toggleDadosVisiveis = () => {
    setDadosVisiveis(prev => !prev);
  };

  const formatarValor = (valor: number): string => {
    if (!dadosVisiveis) {
      return "R$ ••••••";
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const formatarNumero = (numero: number): string => {
    if (!dadosVisiveis) {
      return "••";
    }
    return String(numero);
  };

  const formatarPorcentagem = (valor: number): string => {
    if (!dadosVisiveis) {
      return "••%";
    }
    return `${valor}%`;
  };

  const formatarTexto = (texto: string, maxLength: number = 10): string => {
    if (!dadosVisiveis) {
      return "•".repeat(Math.min(texto.length, maxLength));
    }
    return texto;
  };

  return (
    <DadosSensiveisContext.Provider value={{
      dadosVisiveis,
      toggleDadosVisiveis,
      formatarValor,
      formatarNumero,
      formatarPorcentagem,
      formatarTexto
    }}>
      {children}
    </DadosSensiveisContext.Provider>
  );
};

export const useDadosSensiveis = () => {
  const context = useContext(DadosSensiveisContext);
  if (context === undefined) {
    throw new Error('useDadosSensiveis must be used within a DadosSensiveisProvider');
  }
  return context;
};
