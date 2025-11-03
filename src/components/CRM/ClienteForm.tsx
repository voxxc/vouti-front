import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clienteSchema, ClienteFormData } from '@/lib/validations/cliente';
import { Cliente, PessoaAdicional } from '@/types/cliente';
import { useClientes } from '@/hooks/useClientes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ClienteFormProps {
  cliente?: Cliente;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ClienteForm = ({ cliente, onSuccess, onCancel }: ClienteFormProps) => {
  const { createCliente, updateCliente, uploadDocumento, loading } = useClientes();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [pessoasAdicionais, setPessoasAdicionais] = useState<PessoaAdicional[]>(
    cliente?.pessoas_adicionais || []
  );
  const isEditing = !!cliente;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: cliente ? {
      nome_pessoa_fisica: cliente.nome_pessoa_fisica || '',
      nome_pessoa_juridica: cliente.nome_pessoa_juridica || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      data_nascimento: cliente.data_nascimento || '',
      endereco: cliente.endereco || '',
      data_fechamento: cliente.data_fechamento || '',
      valor_contrato: cliente.valor_contrato?.toString() || '',
      forma_pagamento: cliente.forma_pagamento || 'a_vista',
    valor_entrada: cliente.valor_entrada?.toString() || '',
    numero_parcelas: cliente.numero_parcelas?.toString() || '',
    valor_parcela: cliente.valor_parcela?.toString() || '',
    data_vencimento_inicial: cliente.data_vencimento_inicial || '',
      data_vencimento_final: cliente.data_vencimento_final || '',
      vendedor: cliente.vendedor || '',
      origem_rede_social: cliente.origem_rede_social || '',
      origem_tipo: cliente.origem_tipo || undefined,
      observacoes: cliente.observacoes || '',
      classificacao: cliente.classificacao || 'pf',
      status_cliente: cliente.status_cliente || 'ativo',
    } : {
      forma_pagamento: 'a_vista',
      classificacao: 'pf',
      status_cliente: 'ativo',
    },
  });

  const formaPagamento = watch('forma_pagamento');
  const classificacao = watch('classificacao');

  const addPessoaAdicional = () => {
    setPessoasAdicionais([...pessoasAdicionais, {
      nome_pessoa_fisica: '',
      nome_pessoa_juridica: '',
      telefone: '',
      email: '',
      data_nascimento: '',
      endereco: '',
    }]);
  };

  const removePessoaAdicional = (index: number) => {
    setPessoasAdicionais(pessoasAdicionais.filter((_, i) => i !== index));
  };

  const updatePessoaAdicional = (index: number, field: keyof PessoaAdicional, value: string) => {
    const updated = [...pessoasAdicionais];
    updated[index] = { ...updated[index], [field]: value };
    setPessoasAdicionais(updated);
  };

  const onSubmit = async (data: ClienteFormData) => {
    const clienteData: Partial<Cliente> = {
      nome_pessoa_fisica: data.nome_pessoa_fisica || undefined,
      nome_pessoa_juridica: data.nome_pessoa_juridica || undefined,
      telefone: data.telefone || undefined,
      email: data.email || undefined,
      data_nascimento: data.data_nascimento || undefined,
      endereco: data.endereco || undefined,
      data_fechamento: data.data_fechamento,
      valor_contrato: parseFloat(data.valor_contrato),
      forma_pagamento: data.forma_pagamento,
      valor_entrada: data.valor_entrada ? parseFloat(data.valor_entrada) : undefined,
      numero_parcelas: data.numero_parcelas ? parseInt(data.numero_parcelas) : undefined,
      valor_parcela: data.valor_parcela ? parseFloat(data.valor_parcela) : undefined,
      data_vencimento_inicial: data.data_vencimento_inicial || undefined,
      data_vencimento_final: data.data_vencimento_final || undefined,
      vendedor: data.vendedor || undefined,
      origem_rede_social: data.origem_rede_social || undefined,
      origem_tipo: data.origem_tipo || undefined,
      observacoes: data.observacoes || undefined,
      classificacao: data.classificacao,
      status_cliente: data.status_cliente || 'ativo',
      pessoas_adicionais: pessoasAdicionais.filter(p => 
        p.nome_pessoa_fisica || p.nome_pessoa_juridica
      ),
    };

    let result;
    if (isEditing) {
      result = await updateCliente(cliente.id, clienteData);
    } else {
      result = await createCliente(clienteData);
    }

    if (result && selectedFiles.length > 0) {
      setUploadingFiles(true);
      for (const file of selectedFiles) {
        await uploadDocumento(result.id, file);
      }
      setUploadingFiles(false);
    }

    if (result) {
      onSuccess();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* SEÇÃO 1: CLASSIFICAÇÃO DO CLIENTE */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <Label className="text-base font-semibold mb-3 block">Classificação do Cliente *</Label>
        <RadioGroup 
          value={classificacao} 
          onValueChange={(value) => setValue('classificacao', value as 'pf' | 'pj')}
        >
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pf" id="pf" />
              <Label htmlFor="pf" className="cursor-pointer font-normal">👤 Pessoa Física</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pj" id="pj" />
              <Label htmlFor="pj" className="cursor-pointer font-normal">🏢 Pessoa Jurídica</Label>
            </div>
          </div>
        </RadioGroup>
        {errors.classificacao && (
          <p className="text-sm text-destructive mt-2">{errors.classificacao.message}</p>
        )}
      </div>

      {/* SEÇÃO 2: CONTRATANTE PRINCIPAL */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>👤</span> Contratante Principal
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome_pessoa_fisica">Nome Pessoa Física</Label>
            <Input id="nome_pessoa_fisica" {...register('nome_pessoa_fisica')} />
            {errors.nome_pessoa_fisica && (
              <p className="text-sm text-destructive">{errors.nome_pessoa_fisica.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome_pessoa_juridica">Nome Pessoa Jurídica</Label>
            <Input id="nome_pessoa_juridica" {...register('nome_pessoa_juridica')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" {...register('telefone')} placeholder="(00) 00000-0000" />
            {errors.telefone && (
              <p className="text-sm text-destructive">{errors.telefone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_nascimento">Data de Nascimento</Label>
            <Input id="data_nascimento" type="date" {...register('data_nascimento')} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input id="endereco" {...register('endereco')} />
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: PESSOAS/EMPRESAS ADICIONAIS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>👥</span> Pessoas/Empresas Adicionais
          </h3>
          <Button type="button" onClick={addPessoaAdicional} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
        
        {pessoasAdicionais.length === 0 && (
          <p className="text-sm text-muted-foreground italic py-4 text-center border border-dashed rounded-lg">
            Nenhuma pessoa/empresa adicional cadastrada
          </p>
        )}
        
        <div className="space-y-4">
          {pessoasAdicionais.map((pessoa, index) => (
            <div key={index} className="p-4 border rounded-lg relative bg-card">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => removePessoaAdicional(index)}
              >
                <X className="h-4 w-4" />
              </Button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-10">
                <div className="space-y-2">
                  <Label>Nome Pessoa Física</Label>
                  <Input
                    value={pessoa.nome_pessoa_fisica || ''}
                    onChange={(e) => updatePessoaAdicional(index, 'nome_pessoa_fisica', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Nome Pessoa Jurídica</Label>
                  <Input
                    value={pessoa.nome_pessoa_juridica || ''}
                    onChange={(e) => updatePessoaAdicional(index, 'nome_pessoa_juridica', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={pessoa.telefone || ''}
                    onChange={(e) => updatePessoaAdicional(index, 'telefone', e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={pessoa.email || ''}
                    onChange={(e) => updatePessoaAdicional(index, 'email', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={pessoa.data_nascimento || ''}
                    onChange={(e) => updatePessoaAdicional(index, 'data_nascimento', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Endereço</Label>
                  <Input
                    value={pessoa.endereco || ''}
                    onChange={(e) => updatePessoaAdicional(index, 'endereco', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SEÇÃO 4: DADOS DO CONTRATO */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>📄</span> Dados do Contrato
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="data_fechamento">Data de Fechamento *</Label>
            <Input id="data_fechamento" type="date" {...register('data_fechamento')} />
            {errors.data_fechamento && (
              <p className="text-sm text-destructive">{errors.data_fechamento.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor_contrato">Valor do Contrato *</Label>
            <Input id="valor_contrato" type="number" step="0.01" {...register('valor_contrato')} placeholder="0.00" />
            {errors.valor_contrato && (
              <p className="text-sm text-destructive">{errors.valor_contrato.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="forma_pagamento">Forma de Pagamento *</Label>
            <Select
              value={watch('forma_pagamento')}
              onValueChange={(value) => setValue('forma_pagamento', value as 'a_vista' | 'parcelado')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a_vista">À Vista</SelectItem>
                <SelectItem value="parcelado">Parcelado</SelectItem>
              </SelectContent>
            </Select>
            {errors.forma_pagamento && (
              <p className="text-sm text-destructive">{errors.forma_pagamento.message}</p>
            )}
          </div>

          {formaPagamento === 'parcelado' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="valor_entrada">Valor de Entrada</Label>
                <Input id="valor_entrada" type="number" step="0.01" {...register('valor_entrada')} placeholder="0.00" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_parcelas">Número de Parcelas *</Label>
                <Input id="numero_parcelas" type="number" {...register('numero_parcelas')} placeholder="12" />
                {errors.numero_parcelas && (
                  <p className="text-sm text-destructive">{errors.numero_parcelas.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_parcela">Valor da Parcela</Label>
                <Input id="valor_parcela" type="number" step="0.01" {...register('valor_parcela')} placeholder="0.00" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_vencimento_inicial">Vencimento Inicial *</Label>
                <Input 
                  id="data_vencimento_inicial" 
                  type="date" 
                  {...register('data_vencimento_inicial')} 
                />
                {errors.data_vencimento_inicial && (
                  <p className="text-sm text-destructive">{errors.data_vencimento_inicial.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_vencimento_final">Vencimento Final *</Label>
                <Input 
                  id="data_vencimento_final" 
                  type="date" 
                  {...register('data_vencimento_final')} 
                />
                {errors.data_vencimento_final && (
                  <p className="text-sm text-destructive">{errors.data_vencimento_final.message}</p>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="vendedor">Vendedor</Label>
            <Input id="vendedor" {...register('vendedor')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="origem_tipo">Tipo de Origem</Label>
            <Select
              value={watch('origem_tipo')}
              onValueChange={(value) => setValue('origem_tipo', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="indicacao">Indicação</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="origem_rede_social">Origem (Rede Social)</Label>
            <Input id="origem_rede_social" {...register('origem_rede_social')} placeholder="@usuario ou nome da página" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status_cliente">Status do Cliente</Label>
            <Select
              value={watch('status_cliente')}
              onValueChange={(value) => setValue('status_cliente', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">✅ Ativo</SelectItem>
                <SelectItem value="inativo">⏸️ Inativo</SelectItem>
                <SelectItem value="contrato_encerrado">🔒 Contrato Encerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" {...register('observacoes')} rows={3} />
          </div>

          {!isEditing && (
            <div className="space-y-2 md:col-span-2">
              <Label>Documentos (opcional)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground text-center">
                    <label htmlFor="file-upload" className="cursor-pointer text-primary hover:underline">
                      Clique para fazer upload
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading || uploadingFiles}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || uploadingFiles}>
          {loading || uploadingFiles ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
};