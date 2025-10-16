import { z } from 'zod';

export const clienteSchema = z.object({
  nome_pessoa_fisica: z.string().optional(),
  nome_pessoa_juridica: z.string().optional(),
  telefone: z.string().min(10, 'Telefone deve ter no mínimo 10 dígitos').optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  data_nascimento: z.string().optional().or(z.literal('')),
  endereco: z.string().optional(),
  data_fechamento: z.string().min(1, 'Data de fechamento é obrigatória'),
  valor_contrato: z.string().min(1, 'Valor do contrato é obrigatório'),
  forma_pagamento: z.enum(['a_vista', 'parcelado'], {
    required_error: 'Selecione a forma de pagamento'
  }),
  valor_entrada: z.string().optional(),
  numero_parcelas: z.string().optional(),
  valor_parcela: z.string().optional(),
  dia_vencimento: z.string().optional(),
  vendedor: z.string().optional(),
  origem_rede_social: z.string().optional(),
  origem_tipo: z.enum(['instagram', 'facebook', 'indicacao', 'outro']).optional(),
  observacoes: z.string().optional(),
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
);

export type ClienteFormData = z.infer<typeof clienteSchema>;
