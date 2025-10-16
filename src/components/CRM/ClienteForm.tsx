import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clienteSchema, ClienteFormData } from '@/lib/validations/cliente';
import { Cliente } from '@/types/cliente';
import { useClientes } from '@/hooks/useClientes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface ClienteFormProps {
  cliente?: Cliente;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ClienteForm = ({ cliente, onSuccess, onCancel }: ClienteFormProps) => {
  const { createCliente, updateCliente, uploadDocumento, loading } = useClientes();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
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
      dia_vencimento: cliente.dia_vencimento?.toString() || '',
      vendedor: cliente.vendedor || '',
      origem_rede_social: cliente.origem_rede_social || '',
      origem_tipo: cliente.origem_tipo || undefined,
      observacoes: cliente.observacoes || '',
    } : {
      forma_pagamento: 'a_vista',
    },
  });

  const formaPagamento = watch('forma_pagamento');

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
      dia_vencimento: data.dia_vencimento ? parseInt(data.dia_vencimento) : undefined,
      vendedor: data.vendedor || undefined,
      origem_rede_social: data.origem_rede_social || undefined,
      origem_tipo: data.origem_tipo || undefined,
      observacoes: data.observacoes || undefined,
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

        <div className="space-y-2">
          <Label htmlFor="data_fechamento">Data de Fechamento *</Label>
          <Input id="data_fechamento" type="date" {...register('data_fechamento')} />
          {errors.data_fechamento && (
            <p className="text-sm text-destructive">{errors.data_fechamento.message}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="endereco">Endereço</Label>
          <Input id="endereco" {...register('endereco')} />
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
              <Label htmlFor="dia_vencimento">Dia do Vencimento</Label>
              <Input id="dia_vencimento" type="number" min="1" max="31" {...register('dia_vencimento')} placeholder="10" />
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
