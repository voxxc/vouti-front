import { Cliente, ClienteDocumento } from '@/types/cliente';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Download, Trash2, FileText } from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClienteDetailsProps {
  cliente: Cliente;
  onEdit: () => void;
}

export const ClienteDetails = ({ cliente, onEdit }: ClienteDetailsProps) => {
  const { fetchDocumentos, downloadDocumento, deleteDocumento } = useClientes();
  const [documentos, setDocumentos] = useState<ClienteDocumento[]>([]);

  useEffect(() => {
    loadDocumentos();
  }, [cliente.id]);

  const loadDocumentos = async () => {
    const docs = await fetchDocumentos(cliente.id);
    setDocumentos(docs);
  };

  const handleDeleteDoc = async (docId: string, filePath: string) => {
    if (confirm('Deseja realmente excluir este documento?')) {
      const success = await deleteDocumento(docId, filePath);
      if (success) {
        loadDocumentos();
      }
    }
  };

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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-2">
            <CardTitle>{nomeCliente}</CardTitle>
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
          <Button onClick={onEdit} variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
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

            {cliente.data_nascimento && (
              <div>
                <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                <p className="font-medium">{format(new Date(cliente.data_nascimento), 'dd/MM/yyyy', { locale: ptBR })}</p>
              </div>
            )}

            {cliente.endereco && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Endereço</p>
                <p className="font-medium">{cliente.endereco}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground">Data de Fechamento</p>
              <p className="font-medium">{format(new Date(cliente.data_fechamento), 'dd/MM/yyyy', { locale: ptBR })}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Valor do Contrato</p>
              <p className="font-medium text-lg">{formatCurrency(cliente.valor_contrato)}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
              <Badge variant={cliente.forma_pagamento === 'a_vista' ? 'default' : 'secondary'}>
                {cliente.forma_pagamento === 'a_vista' ? 'À Vista' : 'Parcelado'}
              </Badge>
            </div>

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
                <p className="text-sm text-muted-foreground">Origem (Rede Social)</p>
                <p className="font-medium">{cliente.origem_rede_social}</p>
              </div>
            )}

            {cliente.observacoes && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Observações</p>
                <p className="font-medium whitespace-pre-wrap">{cliente.observacoes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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

      {documentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documentos.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadDocumento(doc.file_path, doc.file_name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDoc(doc.id, doc.file_path)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
