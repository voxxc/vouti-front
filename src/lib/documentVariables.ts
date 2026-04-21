import type { Cliente } from '@/types/cliente';

const FALLBACK = '_____________';

function fmt(value: string | undefined | null): string {
  if (!value || !String(value).trim()) return FALLBACK;
  return String(value).trim();
}

function buildEnderecoCompleto(c: Partial<Cliente>): string {
  const parts = [c.endereco, c.uf].filter(Boolean);
  return parts.length ? parts.join(', ') : FALLBACK;
}

function nomeCliente(c: Partial<Cliente>): string {
  return fmt(c.nome_pessoa_fisica || c.nome_pessoa_juridica);
}

function cpfOuCnpj(c: Partial<Cliente>): string {
  return fmt(c.cpf || c.cnpj);
}

/**
 * Mapeia chaves de variáveis (literais) para os valores do cliente.
 * As chaves seguem o padrão ${_Nome_cliente_} declarado em DOCUMENT_VARIABLES.
 */
export function buildVariableMap(cliente: Partial<Cliente>): Record<string, string> {
  return {
    '${_Nome_cliente_}': nomeCliente(cliente),
    '${_Nacionalidade_cliente_}': 'brasileiro(a)',
    '${_RG_cliente_}': FALLBACK,
    '${_CPF/CNPJ_cliente_}': cpfOuCnpj(cliente),
    '${_Endereco_cliente_}': buildEnderecoCompleto(cliente),
    '${_Rua_cliente_}': fmt(cliente.endereco),
    '${_Numero_cliente_}': FALLBACK,
    '${_Complemento_cliente_}': FALLBACK,
    '${_Bairro_cliente_}': FALLBACK,
    '${_CEP_cliente_}': FALLBACK,
    '${_Cidade_cliente_}': FALLBACK,
    '${_Estado_cliente_}': fmt(cliente.uf),
    '${_Email_cliente_}': fmt(cliente.email),
    '${_Telefone_cliente_}': fmt(cliente.telefone),
    '${_Profissao_cliente_}': fmt(cliente.profissao),
  };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Substitui todas as variáveis ${_X_cliente_} pelos valores reais do cliente
 * preservando o HTML. Variáveis não mapeadas permanecem intactas.
 */
export function applyClienteVariables(html: string, cliente: Partial<Cliente>): string {
  if (!html) return html;
  const map = buildVariableMap(cliente);
  let out = html;
  for (const [key, value] of Object.entries(map)) {
    const re = new RegExp(escapeRegExp(key), 'g');
    out = out.replace(re, value);
  }
  return out;
}

/**
 * Renderiza HTML com variáveis destacadas em amarelo (modo edição visual).
 * Quando há cliente, mostra o valor entre parênteses ao lado da variável.
 */
export function highlightVariables(html: string, cliente?: Partial<Cliente> | null): string {
  if (!html) return html;
  const map = cliente ? buildVariableMap(cliente) : null;
  // Match qualquer ${_..._} para destacar
  return html.replace(/\$\{_[^}]+_\}/g, (match) => {
    const value = map?.[match];
    const inner = value && value !== FALLBACK
      ? `${match} <span style="color:#92400e;font-style:italic">(${value})</span>`
      : match;
    return `<span style="background-color:#fef3c7;padding:0 2px;border-radius:2px" data-variable="${match}">${inner}</span>`;
  });
}