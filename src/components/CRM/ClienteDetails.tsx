import { useState } from 'react';
import { Cliente, DadosVeiculares } from '@/types/cliente';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ClienteDocumentosTab } from './ClienteDocumentosTab';
import { parseLocalDate } from '@/lib/dateUtils';

interface ClienteDetailsProps {
  cliente: Cliente;
  onEdit: () => void;
  readOnly?: boolean;
}

// Helper component for consistent row display
const InfoRow = ({ label, value }: { label: string; value?: string | React.ReactNode }) => {
  if (!value) return null;
  return (
    <div className="flex py-2">
      <span className="w-48 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide pr-6 shrink-0">
        {label}
      </span>
      <span className="flex-1 text-sm">
        {value}
      </span>
    </div>
  );
};

export const ClienteDetails = ({ cliente, onEdit, readOnly = false }: ClienteDetailsProps) => {
  const [activeTab, setActiveTab] = useState<'info' | 'documentos'>('info');

  const formatCurrency = (value?: number) => {
    if (!value) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return format(parseLocalDate(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const nomeCliente = cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || 'Cliente sem nome';

  // Check if contract section has any data
  const hasContractData = cliente.data_fechamento || cliente.valor_contrato || cliente.forma_pagamento;
  
  // Check if origin section has any data
  const hasOriginData = cliente.origem_tipo || cliente.origem_rede_social;

  return (
    <div className="space-y-4">
      {/* Header com nome, badge e ícone de editar */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{nomeCliente}</h2>
        <div className="flex items-center gap-2">
          {cliente.classificacao && (
            <span className={cn(
              "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
              cliente.classificacao === 'pf' 
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
            )}>
              {cliente.classificacao === 'pf' ? '👤 Pessoa Física' : '🏢 Pessoa Jurídica'}
            </span>
          )}
          {!readOnly && (
            <button 
              onClick={onEdit}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Editar cliente"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navegação por texto */}
      <div className="flex gap-6 border-b">
        <button
          onClick={() => setActiveTab('info')}
          className={cn(
            "pb-2 text-sm font-medium transition-colors relative",
            activeTab === 'info'
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Informações
          {activeTab === 'info' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('documentos')}
          className={cn(
            "pb-2 text-sm font-medium transition-colors relative",
            activeTab === 'documentos'
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Documentos
          {activeTab === 'documentos' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      </div>

      {/* Conteúdo */}
      {activeTab === 'info' ? (
        <div className="mt-6 space-y-1">
          {/* Dados Pessoais */}
          <InfoRow label="Nome" value={cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica} />
          <InfoRow label="Telefone" value={cliente.telefone} />
          <InfoRow label="E-mail" value={cliente.email} />
          <InfoRow label="Data de Nascimento" value={formatDate(cliente.data_nascimento)} />
          <InfoRow label="Profissão" value={cliente.profissao} />
          <InfoRow label="Endereço" value={cliente.endereco} />
          <InfoRow label="UF" value={cliente.uf} />

          <Separator className="my-4" />

          {/* Documentos */}
          <InfoRow label="CPF" value={cliente.cpf} />
          <InfoRow label="CNPJ" value={cliente.cnpj} />

          {/* Dados Veiculares */}
          {cliente.dados_veiculares?.veiculos?.length ? (
            <>
              <Separator className="my-4" />
              <div className="py-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Dados Veiculares
                </span>
              </div>
              {(cliente.dados_veiculares as DadosVeiculares).veiculos.map((v, i) => (
                <div key={i} className="ml-4 py-2 border-l-2 border-muted pl-4 mb-2">
                  <p className="font-medium text-sm mb-1">Veículo {i + 1}</p>
                  <div className="space-y-1">
                    <InfoRow label="CNH" value={v.cnh} />
                    <InfoRow label="Validade CNH" value={formatDate(v.cnh_validade)} />
                    <InfoRow label="RENAVAM" value={v.renavam} />
                    <InfoRow label="Placa" value={v.placa} />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <InfoRow label="CNH" value={cliente.cnh} />
              <InfoRow label="Validade CNH" value={formatDate(cliente.cnh_validade)} />
            </>
          )}
          <InfoRow label="Proveito Econômico" value={cliente.proveito_economico ? `${cliente.proveito_economico}%` : null} />

          {/* Contrato */}
          {hasContractData && (
            <>
              <Separator className="my-4" />
              <InfoRow label="Data de Fechamento" value={formatDate(cliente.data_fechamento)} />
              <InfoRow 
                label="Valor do Contrato" 
                value={cliente.valor_contrato ? (
                  <span className="font-medium">{formatCurrency(cliente.valor_contrato)}</span>
                ) : null} 
              />
              <InfoRow 
                label="Forma de Pagamento" 
                value={cliente.forma_pagamento ? (
                  <Badge variant={cliente.forma_pagamento === 'a_vista' ? 'default' : 'secondary'}>
                    {cliente.forma_pagamento === 'a_vista' ? 'À Vista' : 'Parcelado'}
                  </Badge>
                ) : null} 
              />
              
              {cliente.forma_pagamento === 'parcelado' && (
                <>
                  {cliente.valor_entrada && cliente.valor_entrada > 0 && (
                    <InfoRow label="Valor de Entrada" value={formatCurrency(cliente.valor_entrada)} />
                  )}
                  <InfoRow label="Número de Parcelas" value={cliente.numero_parcelas ? `${cliente.numero_parcelas}x` : null} />
                  <InfoRow label="Valor da Parcela" value={formatCurrency(cliente.valor_parcela)} />
                  {cliente.data_vencimento_inicial && cliente.data_vencimento_final && (
                    <InfoRow 
                      label="Período de Vencimento" 
                      value={`${formatDate(cliente.data_vencimento_inicial)} até ${formatDate(cliente.data_vencimento_final)}`} 
                    />
                  )}
                </>
              )}
              
              <InfoRow label="Vendedor" value={cliente.vendedor} />
            </>
          )}

          {/* Origem */}
          {hasOriginData && (
            <>
              <Separator className="my-4" />
              <InfoRow 
                label="Tipo de Origem" 
                value={cliente.origem_tipo ? (
                  <Badge variant="outline">
                    {cliente.origem_tipo === 'instagram' ? 'Instagram' :
                     cliente.origem_tipo === 'facebook' ? 'Facebook' :
                     cliente.origem_tipo === 'indicacao' ? 'Indicação' : 'Outro'}
                  </Badge>
                ) : null} 
              />
              <InfoRow label="Rede Social" value={cliente.origem_rede_social} />
            </>
          )}

          {/* Observações */}
          {cliente.observacoes && (
            <>
              <Separator className="my-4" />
              <InfoRow 
                label="Observações" 
                value={<span className="whitespace-pre-wrap">{cliente.observacoes}</span>} 
              />
            </>
          )}

          {/* Pessoas/Empresas Adicionais */}
          {cliente.pessoas_adicionais && cliente.pessoas_adicionais.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="py-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Pessoas/Empresas Adicionais
                </span>
              </div>
              {cliente.pessoas_adicionais.map((pessoa, index) => (
                <div key={index} className="ml-4 py-2 border-l-2 border-muted pl-4 mb-4">
                  <p className="font-medium text-sm mb-2">
                    {pessoa.nome_pessoa_fisica || pessoa.nome_pessoa_juridica}
                  </p>
                  <div className="space-y-1">
                    <InfoRow label="Telefone" value={pessoa.telefone} />
                    <InfoRow label="E-mail" value={pessoa.email} />
                    <InfoRow label="Nascimento" value={formatDate(pessoa.data_nascimento)} />
                    <InfoRow label="Endereço" value={pessoa.endereco} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <ClienteDocumentosTab clienteId={cliente.id} readOnly={readOnly} />
        </div>
      )}
    </div>
  );
};
