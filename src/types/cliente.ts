export interface GrupoParcela {
  ordem: number;
  descricao?: string;
  quantidade: number;
  valor_parcela: number;
  data_inicio: string;
}

export interface GruposParcelasConfig {
  entrada?: {
    valor: number;
    data_vencimento: string;
  };
  grupos: GrupoParcela[];
}

export interface PessoaAdicional {
  nome_pessoa_fisica?: string;
  nome_pessoa_juridica?: string;
  cpf?: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  data_nascimento?: string;
  endereco?: string;
  profissao?: string;
  uf?: string;
}

export interface Cliente {
  id: string;
  user_id: string;
  nome_pessoa_fisica?: string;
  nome_pessoa_juridica?: string;
  cpf?: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  data_nascimento?: string;
  endereco?: string;
  profissao?: string;
  uf?: string;
  data_fechamento: string;
  data_cadastro?: string;
  valor_contrato: number;
  forma_pagamento: 'a_vista' | 'parcelado';
  valor_entrada?: number;
  numero_parcelas?: number;
  valor_parcela?: number;
  data_vencimento_inicial?: string;
  data_vencimento_final?: string;
  vendedor?: string;
  origem_rede_social?: string;
  origem_tipo?: 'instagram' | 'facebook' | 'indicacao' | 'outro';
  observacoes?: string;
  classificacao?: 'pf' | 'pj';
  status_cliente?: 'ativo' | 'inativo' | 'contrato_encerrado';
  pessoas_adicionais?: PessoaAdicional[];
  grupos_parcelas?: GruposParcelasConfig;
  created_at?: string;
  updated_at?: string;
}

export interface ClienteDocumento {
  id: string;
  cliente_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by: string;
  created_at: string;
}
