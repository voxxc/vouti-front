import { Cliente } from '@/types/cliente';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Info, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ClienteDocumentosTab } from './ClienteDocumentosTab';

interface ClienteDetailsProps {
  cliente: Cliente;
  onEdit: () => void;
  readOnly?: boolean;
}

export const ClienteDetails = ({ cliente, onEdit, readOnly = false }: ClienteDetailsProps) => {
  const formatCurrency = (value?: number) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const nomeCliente = cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || 'Cliente sem nome';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{nomeCliente}</h2>
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
        </div>
        {!readOnly && (
          <Button onClick={onEdit} variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Informações
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados Pessoais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cliente.nome_pessoa_fisica && (
                  <div>
                    <p className="text-sm text-muted-foreground">Nome (PF)</p>
                    <p className="font-medium">{cliente.nome_pessoa_fisica}</p>
                  </div>
                )}
                
                {cliente.nome_pessoa_juridica && (
                  <div>
                    <p className="text-sm text-muted-foreground">Nome (PJ)</p>
                    <p className="font-medium">{cliente.nome_pessoa_juridica}</p>
                  </div>
                )}

                {cliente.cpf && (
                  <div>
                    <p className="text-sm text-muted-foreground">CPF</p>
                    <p className="font-medium">{cliente.cpf}</p>
                  </div>
                )}

                {cliente.cnpj && (
                  <div>
                    <p className="text-sm text-muted-foreground">CNPJ</p>
                    <p className="font-medium">{cliente.cnpj}</p>
                  </div>
                )}

                {cliente.telefone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{cliente.telefone}</p>
                  </div>
                )}

                {cliente.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">E-mail</p>
                    <p className="font-medium">{cliente.email}</p>
                  </div>
                )}

                {cliente.cnh && (
                  <div>
                    <p className="text-sm text-muted-foreground">CNH</p>
                    <p className="font-medium">{cliente.cnh}</p>
                  </div>
                )}

                {cliente.cnh_validade && (
                  <div>
                    <p className="text-sm text-muted-foreground">Validade CNH</p>
                    <p className="font-medium">{format(new Date(cliente.cnh_validade), 'dd/MM/yyyy', { locale: ptBR })}</p>
                  </div>
                )}

                {cliente.proveito_economico && (
                  <div>
                    <p className="text-sm text-muted-foreground">Proveito Econômico</p>
                    <p className="font-medium">{cliente.proveito_economico}%</p>
                  </div>
                )}

                {cliente.data_nascimento && (
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                    <p className="font-medium">{format(new Date(cliente.data_nascimento), 'dd/MM/yyyy', { locale: ptBR })}</p>
                  </div>
                )}

                {cliente.profissao && (
                  <div>
                    <p className="text-sm text-muted-foreground">Profissão</p>
                    <p className="font-medium">{cliente.profissao}</p>
                  </div>
                )}

                {cliente.endereco && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Endereço</p>
                    <p className="font-medium">{cliente.endereco}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dados do Contrato */}
          {(cliente.data_fechamento || cliente.valor_contrato || cliente.forma_pagamento) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados do Contrato</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cliente.data_fechamento && (
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Fechamento</p>
                      <p className="font-medium">{format(new Date(cliente.data_fechamento), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                  )}

                  {cliente.valor_contrato && (
                    <div>
                      <p className="text-sm text-muted-foreground">Valor do Contrato</p>
                      <p className="font-medium text-lg">{formatCurrency(cliente.valor_contrato)}</p>
                    </div>
                  )}

                  {cliente.forma_pagamento && (
                    <div>
                      <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
                      <Badge variant={cliente.forma_pagamento === 'a_vista' ? 'default' : 'secondary'}>
                        {cliente.forma_pagamento === 'a_vista' ? 'À Vista' : 'Parcelado'}
                      </Badge>
                    </div>
                  )}

                  {cliente.forma_pagamento === 'parcelado' && (
                    <>
                      {cliente.valor_entrada && cliente.valor_entrada > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground">Valor de Entrada</p>
                          <p className="font-medium">{formatCurrency(cliente.valor_entrada)}</p>
                        </div>
                      )}

                      {cliente.numero_parcelas && (
                        <div>
                          <p className="text-sm text-muted-foreground">Número de Parcelas</p>
                          <p className="font-medium">{cliente.numero_parcelas}x</p>
                        </div>
                      )}

                      {cliente.valor_parcela && (
                        <div>
                          <p className="text-sm text-muted-foreground">Valor da Parcela</p>
                          <p className="font-medium">{formatCurrency(cliente.valor_parcela)}</p>
                        </div>
                      )}

                      {cliente.data_vencimento_inicial && cliente.data_vencimento_final && (
                        <div>
                          <p className="text-sm text-muted-foreground">Período de Vencimento</p>
                          <p className="font-medium">
                            {format(new Date(cliente.data_vencimento_inicial), 'dd/MM/yyyy')} até {format(new Date(cliente.data_vencimento_final), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {cliente.vendedor && (
                    <div>
                      <p className="text-sm text-muted-foreground">Vendedor</p>
                      <p className="font-medium">{cliente.vendedor}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Origem */}
          {(cliente.origem_tipo || cliente.origem_rede_social) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Origem</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cliente.origem_tipo && (
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo de Origem</p>
                      <Badge variant="outline">
                        {cliente.origem_tipo === 'instagram' ? 'Instagram' :
                         cliente.origem_tipo === 'facebook' ? 'Facebook' :
                         cliente.origem_tipo === 'indicacao' ? 'Indicação' : 'Outro'}
                      </Badge>
                    </div>
                  )}

                  {cliente.origem_rede_social && (
                    <div>
                      <p className="text-sm text-muted-foreground">Rede Social</p>
                      <p className="font-medium">{cliente.origem_rede_social}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Observações */}
          {cliente.observacoes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{cliente.observacoes}</p>
              </CardContent>
            </Card>
          )}

          {/* Pessoas/Empresas Adicionais */}
          {cliente.pessoas_adicionais && cliente.pessoas_adicionais.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pessoas/Empresas Adicionais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cliente.pessoas_adicionais.map((pessoa, index) => (
                    <div key={index} className="p-4 bg-muted rounded-lg space-y-2">
                      <p className="font-semibold text-base">
                        {pessoa.nome_pessoa_fisica || pessoa.nome_pessoa_juridica}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {pessoa.telefone && (
                          <div>
                            <span className="text-muted-foreground">Telefone: </span>
                            <span>{pessoa.telefone}</span>
                          </div>
                        )}
                        {pessoa.email && (
                          <div>
                            <span className="text-muted-foreground">E-mail: </span>
                            <span>{pessoa.email}</span>
                          </div>
                        )}
                        {pessoa.data_nascimento && (
                          <div>
                            <span className="text-muted-foreground">Nascimento: </span>
                            <span>{format(new Date(pessoa.data_nascimento), 'dd/MM/yyyy', { locale: ptBR })}</span>
                          </div>
                        )}
                        {pessoa.endereco && (
                          <div className="md:col-span-2">
                            <span className="text-muted-foreground">Endereço: </span>
                            <span>{pessoa.endereco}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          <ClienteDocumentosTab clienteId={cliente.id} readOnly={readOnly} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
