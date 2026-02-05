import { z } from 'zod';

// Função para validar CPF
const validarCPF = (cpf: string): boolean => {
  cpf = cpf.replace(/[^\d]/g, ''); // Remove caracteres não numéricos
  
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  
  let soma = 0;
  let resto;
  
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  
  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  
  return true;
};

// Função para validar CNPJ
const validarCNPJ = (cnpj: string): boolean => {
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  
  return true;
};

const pessoaAdicionalSchema = z.object({
  nome_pessoa_fisica: z.string().optional(),
  nome_pessoa_juridica: z.string().optional(),
  cpf: z.string().optional().refine(
    (val) => !val || validarCPF(val),
    { message: 'CPF inválido' }
  ),
  cnpj: z.string().optional().refine(
    (val) => !val || validarCNPJ(val),
    { message: 'CNPJ inválido' }
  ),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  data_nascimento: z.string().optional().or(z.literal('')),
  endereco: z.string().optional(),
  profissao: z.string().optional(),
  uf: z.string().optional().or(z.literal('')),
});

export const clienteSchema = z.object({
  nome_pessoa_fisica: z.string().optional(),
  nome_pessoa_juridica: z.string().optional(),
  cpf: z.string().optional().refine(
    (val) => !val || validarCPF(val),
    { message: 'CPF inválido' }
  ),
  cnpj: z.string().optional().refine(
    (val) => !val || validarCNPJ(val),
    { message: 'CNPJ inválido' }
  ),
  cnh: z.string().optional(),
  cnh_validade: z.string().optional(), // Nova coluna
  telefone: z.string().optional(), // Removida obrigatoriedade de min(10)
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  data_nascimento: z.string().optional().or(z.literal('')),
  endereco: z.string().optional(),
  profissao: z.string().optional(),
  uf: z.string().optional().or(z.literal('')), // Removida validação de length(2)
  data_fechamento: z.string().optional(), // Agora opcional
  valor_contrato: z.string().optional(), // Agora opcional
  forma_pagamento: z.enum(['a_vista', 'parcelado']).optional(), // Agora opcional
  valor_entrada: z.string().optional(),
  numero_parcelas: z.string().optional(),
  valor_parcela: z.string().optional(),
  data_vencimento_inicial: z.string().optional(),
  data_vencimento_final: z.string().optional(),
  vendedor: z.string().optional(),
  origem_rede_social: z.string().optional(),
  origem_tipo: z.enum(['instagram', 'facebook', 'indicacao', 'outro']).optional(),
  observacoes: z.string().optional(),
  classificacao: z.enum(['pf', 'pj']).default('pf').optional(), // Valor padrão 'pf'
  status_cliente: z.enum(['ativo', 'inativo', 'contrato_encerrado']).default('ativo').optional(),
  pessoas_adicionais: z.array(pessoaAdicionalSchema).optional(),
  grupos_parcelas: z.any().optional(), // JSONB field
  proveito_economico: z.string().optional(), // Percentual de proveito econômico
});

export type ClienteFormData = z.infer<typeof clienteSchema>;
