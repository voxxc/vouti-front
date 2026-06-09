import { z } from 'zod';

export const pessoaSchema = z.object({
  nome: z.string().trim().max(200).default(''),
  cpf: z.string().trim().max(20).default(''),
  rg: z.string().trim().max(30).default(''),
  estado_civil: z.string().trim().max(50).default(''),
  profissao: z.string().trim().max(100).default(''),
  telefone: z.string().trim().max(30).default(''),
  email: z.string().trim().max(200).default(''),
  endereco: z.string().trim().max(300).default(''),
  responsavel_contrato: z.boolean().default(false),
});

export const contaSchema = z.object({
  titular: z.string().trim().max(200).default(''),
  banco: z.string().trim().max(100).default(''),
  agencia_conta: z.string().trim().max(60).default(''),
});

export const dividaSchema = z.object({
  banco: z.string().trim().max(100).default(''),
  agencia_conta: z.string().trim().max(60).default(''),
  titular: z.string().trim().max(200).default(''),
  anos_movimentacao: z.string().trim().max(30).default(''),
  valor_divida: z.string().trim().max(40).default(''),
  situacao_parcelas: z.string().trim().max(120).default(''),
  bens_garantia: z.string().trim().max(300).default(''),
  avalistas: z.string().trim().max(300).default(''),
  observacao: z.string().trim().max(500).default(''),
});

export const checklistItemSchema = z.object({
  resposta: z.enum(['sim', 'nao', 'na']).default('na'),
  observacao: z.string().trim().max(300).default(''),
});

export const dadosContratoSchema = z.object({
  forma_captacao: z.string().trim().max(120).default(''),
  consultor: z.string().trim().max(120).default(''),
  advogado_responsavel: z.string().trim().max(120).default(''),
  data_fechamento: z.string().trim().max(20).default(''),
  data_pagamento_entrada: z.string().trim().max(20).default(''),
  responsavel_financeiro: z.string().trim().max(120).default(''),
  servicos_contratados: z.string().trim().max(1000).default(''),
  observacao_geral: z.string().trim().max(2000).default(''),
  situacoes_urgentes: z.string().trim().max(2000).default(''),
  checklist: z.object({
    procuracoes: checklistItemSchema.default({ resposta: 'na', observacao: '' }),
    execucao: checklistItemSchema.default({ resposta: 'na', observacao: '' }),
    citacao: checklistItemSchema.default({ resposta: 'na', observacao: '' }),
    leilao: checklistItemSchema.default({ resposta: 'na', observacao: '' }),
    avalistas: checklistItemSchema.default({ resposta: 'na', observacao: '' }),
    alienacao: checklistItemSchema.default({ resposta: 'na', observacao: '' }),
  }).default({} as any),
});

export const fichaCadastralSchema = z.object({
  cliente_principal: pessoaSchema,
  outros_clientes: z.array(pessoaSchema).default([]),
  contas: z.array(contaSchema).default([]),
  dividas: z.array(dividaSchema).default([]),
  dados_contrato: dadosContratoSchema,
});

export type Pessoa = z.infer<typeof pessoaSchema>;
export type Conta = z.infer<typeof contaSchema>;
export type Divida = z.infer<typeof dividaSchema>;
export type DadosContrato = z.infer<typeof dadosContratoSchema>;
export type FichaCadastral = z.infer<typeof fichaCadastralSchema>;

export const emptyPessoa = (): Pessoa => ({
  nome: '', cpf: '', rg: '', estado_civil: '', profissao: '',
  telefone: '', email: '', endereco: '', responsavel_contrato: false,
});
export const emptyConta = (): Conta => ({ titular: '', banco: '', agencia_conta: '' });
export const emptyDivida = (): Divida => ({
  banco: '', agencia_conta: '', titular: '', anos_movimentacao: '',
  valor_divida: '', situacao_parcelas: '', bens_garantia: '', avalistas: '', observacao: '',
});
export const emptyFicha = (): FichaCadastral => ({
  cliente_principal: emptyPessoa(),
  outros_clientes: [],
  contas: [],
  dividas: [],
  dados_contrato: {
    forma_captacao: '', consultor: '', advogado_responsavel: '',
    data_fechamento: '', data_pagamento_entrada: '', responsavel_financeiro: '',
    servicos_contratados: '', observacao_geral: '', situacoes_urgentes: '',
    checklist: {
      procuracoes: { resposta: 'na', observacao: '' },
      execucao: { resposta: 'na', observacao: '' },
      citacao: { resposta: 'na', observacao: '' },
      leilao: { resposta: 'na', observacao: '' },
      avalistas: { resposta: 'na', observacao: '' },
      alienacao: { resposta: 'na', observacao: '' },
    },
  },
});