import { z } from 'zod';

// Regex para formato judicial brasileiro: 0000000-00.0000.0.00.0000
const PROCESSO_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

export const processoSchema = z.object({
  numero_processo: z.string()
    .regex(PROCESSO_REGEX, 'Formato inválido. Use: 0000000-00.0000.0.00.0000')
    .min(1, 'Número do processo é obrigatório'),
  
  parte_ativa: z.string()
    .min(1, 'Parte ativa é obrigatória')
    .max(500, 'Máximo 500 caracteres'),
  
  parte_passiva: z.string()
    .min(1, 'Parte passiva é obrigatória')
    .max(500, 'Máximo 500 caracteres'),
  
  representantes: z.object({
    ativa: z.array(z.string()).optional(),
    passiva: z.array(z.string()).optional()
  }).optional(),
  
  advogados_partes: z.object({
    ativa: z.array(z.string()).optional(),
    passiva: z.array(z.string()).optional()
  }).optional(),
  
  cpf_cnpj_partes: z.object({
    ativa: z.string().optional(),
    passiva: z.string().optional()
  }).optional(),
  
  tribunal_id: z.string().uuid().nullable().optional(),
  comarca_id: z.string().uuid().nullable().optional(),
  grupo_acao_id: z.string().uuid().nullable().optional(),
  tipo_acao_id: z.string().uuid().nullable().optional(),
  
  valor_causa: z.number().positive().optional().nullable(),
  valor_custas: z.number().positive().optional().nullable(),
  
  advogado_responsavel_id: z.string().uuid().nullable().optional(),
  
  status: z.enum([
    'em_andamento',
    'arquivado',
    'suspenso',
    'conciliacao',
    'sentenca',
    'transito_julgado'
  ]).default('em_andamento'),
  
  prioridade: z.enum(['baixa', 'normal', 'alta', 'urgente']).default('normal'),
  
  data_distribuicao: z.string().optional().nullable(),
  prazo_proximo: z.string().optional().nullable(),
  
  observacoes: z.string().max(5000).optional(),
  
  is_draft: z.boolean().default(false),
  
  etiquetas: z.array(z.string()).optional()
});

export type ProcessoFormData = z.infer<typeof processoSchema>;
