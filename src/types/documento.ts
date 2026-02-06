export interface Documento {
  id: string;
  titulo: string;
  descricao: string | null;
  conteudo_html: string | null;
  cliente_id: string | null;
  projeto_id: string | null;
  responsavel_id: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentoWithRelations extends Documento {
  cliente?: {
    id: string;
    nome_pessoa_fisica: string | null;
    nome_pessoa_juridica: string | null;
  } | null;
  projeto?: {
    id: string;
    name: string;
  } | null;
  responsavel?: {
    user_id: string;
    full_name: string | null;
  } | null;
}

export interface CreateDocumentoData {
  titulo: string;
  descricao?: string;
  conteudo_html?: string;
  cliente_id?: string;
  projeto_id?: string;
  responsavel_id?: string;
}

export interface UpdateDocumentoData {
  titulo?: string;
  descricao?: string;
  conteudo_html?: string;
  cliente_id?: string | null;
  projeto_id?: string | null;
  responsavel_id?: string | null;
}

// Variáveis dinâmicas disponíveis para documentos
export const DOCUMENT_VARIABLES = [
  { key: '${_Nome_cliente_}', label: 'Nome do Cliente', field: 'nome' },
  { key: '${_Nacionalidade_cliente_}', label: 'Nacionalidade', field: 'nacionalidade' },
  { key: '${_RG_cliente_}', label: 'RG', field: 'rg' },
  { key: '${_CPF/CNPJ_cliente_}', label: 'CPF/CNPJ', field: 'cpf_cnpj' },
  { key: '${_Endereco_cliente_}', label: 'Endereço Completo', field: 'endereco' },
  { key: '${_Rua_cliente_}', label: 'Rua', field: 'rua' },
  { key: '${_Numero_cliente_}', label: 'Número', field: 'numero' },
  { key: '${_Complemento_cliente_}', label: 'Complemento', field: 'complemento' },
  { key: '${_Bairro_cliente_}', label: 'Bairro', field: 'bairro' },
  { key: '${_CEP_cliente_}', label: 'CEP', field: 'cep' },
  { key: '${_Cidade_cliente_}', label: 'Cidade', field: 'cidade' },
  { key: '${_Estado_cliente_}', label: 'Estado', field: 'uf' },
  { key: '${_Email_cliente_}', label: 'Email', field: 'email' },
  { key: '${_Telefone_cliente_}', label: 'Telefone', field: 'telefone' },
  { key: '${_Profissao_cliente_}', label: 'Profissão', field: 'profissao' },
] as const;
