import { z } from 'zod';

const pessoaAdicionalSchema = z.object({
  nome_pessoa_fisica: z.string().optional(),
  nome_pessoa_juridica: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  data_nascimento: z.string().optional().or(z.literal('')),
  endereco: z.string().optional(),
  profissao: z.string().optional(),
  uf: z.string().length(2, 'UF deve ter 2 caracteres').optional().or(z.literal('')),
}).refine(
  (data) => data.nome_pessoa_fisica || data.nome_pessoa_juridica,
  {
    message: 'Informe ao menos um nome para a pessoa adicional',
    path: ['nome_pessoa_fisica'],
  }
);

export const clienteSchema = z.object({
  nome_pessoa_fisica: z.string().optional(),
  nome_pessoa_juridica: z.string().optional(),
  telefone: z.string().min(10, 'Telefone deve ter no mínimo 10 dígitos').optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  data_nascimento: z.string().optional().or(z.literal('')),
  endereco: z.string().optional(),
  profissao: z.string().optional(),
  uf: z.string().length(2, 'UF deve ter 2 caracteres').toUpperCase().optional().or(z.literal('')),
  data_fechamento: z.string().min(1, 'Data de fechamento é obrigatória'),
  valor_contrato: z.string().min(1, 'Valor do contrato é obrigatório'),
  forma_pagamento: z.enum(['a_vista', 'parcelado'], {
    required_error: 'Selecione a forma de pagamento'
  }),
  valor_entrada: z.string().optional(),
  numero_parcelas: z.string().optional(),
  valor_parcela: z.string().optional(),
  data_vencimento_inicial: z.string().optional(),
  data_vencimento_final: z.string().optional(),
  vendedor: z.string().optional(),
  origem_rede_social: z.string().optional(),
  origem_tipo: z.enum(['instagram', 'facebook', 'indicacao', 'outro']).optional(),
  observacoes: z.string().optional(),
  classificacao: z.enum(['pf', 'pj'], {
    required_error: 'Selecione a classificação do cliente'
  }),
  status_cliente: z.enum(['ativo', 'inativo', 'contrato_encerrado']).default('ativo').optional(),
  pessoas_adicionais: z.array(pessoaAdicionalSchema).optional(),
}).refine(
  (data) => data.nome_pessoa_fisica || data.nome_pessoa_juridica,
  {
    message: 'Informe ao menos um nome (Pessoa Física ou Pessoa Jurídica)',
    path: ['nome_pessoa_fisica'],
  }
).refine(
  (data) => {
    if (data.forma_pagamento === 'parcelado') {
      return data.numero_parcelas && parseInt(data.numero_parcelas) > 0;
    }
    return true;
  },
  {
    message: 'Informe o número de parcelas',
    path: ['numero_parcelas'],
  }
).refine(
  (data) => {
    if (data.forma_pagamento === 'parcelado') {
      return data.data_vencimento_inicial && data.data_vencimento_final;
    }
    return true;
  },
  {
    message: 'Informe as datas de vencimento inicial e final para pagamento parcelado',
    path: ['data_vencimento_inicial'],
  }
).refine(
  (data) => {
    if (data.data_vencimento_inicial && data.data_vencimento_final) {
      return new Date(data.data_vencimento_final) >= new Date(data.data_vencimento_inicial);
    }
    return true;
  },
  {
    message: 'Data de vencimento final deve ser maior ou igual à inicial',
    path: ['data_vencimento_final'],
  }
);

export type ClienteFormData = z.infer<typeof clienteSchema>;
