import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { processoSchema, ProcessoFormData } from '@/lib/validations/processo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, FileCheck, Loader2 } from 'lucide-react';
import PartesInput from './PartesInput';
import EtiquetasManager from './EtiquetasManager';
import GrupoAcaoCombobox from './GrupoAcaoCombobox';
import AdvogadoSelector from './AdvogadoSelector';

interface ProcessoFormProps {
  processoId?: string;
}

const ProcessoForm = ({ processoId }: ProcessoFormProps) => {
  const { navigate } = useTenantNavigation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors }
  } = useForm<ProcessoFormData>({
    resolver: zodResolver(processoSchema),
    defaultValues: {
      status: 'em_andamento',
      prioridade: 'normal',
      is_draft: false,
      etiquetas: []
    }
  });

  useEffect(() => {
    if (processoId) {
      loadProcesso();
    }
  }, [processoId]);

  const loadProcesso = async () => {
    try {
      const { data, error } = await supabase
        .from('processos')
        .select('*, processo_etiquetas(etiqueta_id)')
        .eq('id', processoId)
        .single();

      if (error) throw error;

      Object.keys(data).forEach(key => {
        if (key === 'processo_etiquetas') {
          setValue('etiquetas', data.processo_etiquetas.map((pe: any) => pe.etiqueta_id));
        } else {
          setValue(key as any, data[key]);
        }
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar processo',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const formatNumeroProcesso = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 7) return numbers;
    if (numbers.length <= 9) return `${numbers.slice(0, 7)}-${numbers.slice(7)}`;
    if (numbers.length <= 13) return `${numbers.slice(0, 7)}-${numbers.slice(7, 9)}.${numbers.slice(9)}`;
    if (numbers.length <= 14) return `${numbers.slice(0, 7)}-${numbers.slice(7, 9)}.${numbers.slice(9, 13)}.${numbers.slice(13)}`;
    if (numbers.length <= 16) return `${numbers.slice(0, 7)}-${numbers.slice(7, 9)}.${numbers.slice(9, 13)}.${numbers.slice(13, 14)}.${numbers.slice(14)}`;
    return `${numbers.slice(0, 7)}-${numbers.slice(7, 9)}.${numbers.slice(9, 13)}.${numbers.slice(13, 14)}.${numbers.slice(14, 16)}.${numbers.slice(16, 20)}`;
  };

  const onSubmit = async (data: ProcessoFormData, isDraft = false) => {
    try {
      if (isDraft) {
        setIsSavingDraft(true);
      } else {
        setIsSubmitting(true);
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const etiquetas = data.etiquetas || [];
      const processoData = {
        ...data,
        etiquetas: undefined,
        is_draft: isDraft,
        created_by: userData.user.id
      };

      let result;
      if (processoId) {
        result = await supabase
          .from('processos')
          .update(processoData as any)
          .eq('id', processoId)
          .select()
          .single();
      } else {
        result = await supabase
          .from('processos')
          .insert(processoData as any)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Gerenciar etiquetas
      if (result.data && etiquetas.length > 0) {
        await supabase
          .from('processo_etiquetas')
          .delete()
          .eq('processo_id', result.data.id);

        await supabase
          .from('processo_etiquetas')
          .insert(
            etiquetas.map(etiquetaId => ({
              processo_id: result.data.id,
              etiqueta_id: etiquetaId
            }))
          );
      }

      toast({
        title: isDraft ? 'Rascunho salvo' : 'Processo cadastrado',
        description: isDraft ? 'Rascunho salvo com sucesso!' : 'Processo cadastrado com sucesso!'
      });

      if (!isDraft && result.data) {
        navigate(`/controladoria/processo/${result.data.id}`);
      } else {
        navigate('/controladoria');
      }

    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
      setIsSavingDraft(false);
    }
  };

  const handleSaveDraft = () => {
    handleSubmit((data) => onSubmit(data, true))();
  };

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data, false))} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados do Processo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="numero_processo">
              Número do Processo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="numero_processo"
              placeholder="0000000-00.0000.0.00.0000"
              {...register('numero_processo')}
              onChange={(e) => {
                const formatted = formatNumeroProcesso(e.target.value);
                setValue('numero_processo', formatted);
              }}
              maxLength={25}
            />
            {errors.numero_processo && (
              <p className="text-sm text-destructive mt-1">{errors.numero_processo.message}</p>
            )}
          </div>

          <PartesInput
            parteAtiva={watch('parte_ativa')}
            partePassiva={watch('parte_passiva')}
            onChangeAtiva={(value) => setValue('parte_ativa', value)}
            onChangePassiva={(value) => setValue('parte_passiva', value)}
            errorsAtiva={errors.parte_ativa?.message}
            errorsPassiva={errors.parte_passiva?.message}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tribunal_nome">Tribunal</Label>
              <Input
                id="tribunal_nome"
                placeholder="Ex: TJSP, TJRJ, TRT 2ª Região..."
                {...register('tribunal_nome')}
              />
            </div>
            <div>
              <Label htmlFor="comarca_nome">Comarca</Label>
              <Input
                id="comarca_nome"
                placeholder="Ex: São Paulo - Capital, Rio de Janeiro..."
                {...register('comarca_nome')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="grupo_acao">Grupo de Ação</Label>
              <GrupoAcaoCombobox
                value={watch('grupo_acao_id') || ''}
                onChange={(value) => setValue('grupo_acao_id', value)}
              />
            </div>
            <div>
              <Label htmlFor="tipo_acao_nome">Tipo de Ação</Label>
              <Input
                id="tipo_acao_nome"
                placeholder="Ex: Ação de Cobrança, Ação de Despejo..."
                {...register('tipo_acao_nome')}
              />
            </div>
          </div>

          <AdvogadoSelector
            value={watch('advogado_responsavel_id')}
            onChange={(value) => setValue('advogado_responsavel_id', value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor_causa">Valor da Causa (R$)</Label>
              <Input
                id="valor_causa"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('valor_causa', { 
                  setValueAs: v => v === '' ? null : parseFloat(v)
                })}
              />
            </div>
            <div>
              <Label htmlFor="valor_custas">Valor das Custas (R$)</Label>
              <Input
                id="valor_custas"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('valor_custas', { 
                  setValueAs: v => v === '' ? null : parseFloat(v)
                })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="arquivado">Arquivado</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                      <SelectItem value="conciliacao">Conciliação</SelectItem>
                      <SelectItem value="sentenca">Sentença</SelectItem>
                      <SelectItem value="transito_julgado">Trânsito em Julgado</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="prioridade">Prioridade</Label>
              <Controller
                name="prioridade"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="data_distribuicao">Data de Distribuição</Label>
              <Input
                id="data_distribuicao"
                type="date"
                {...register('data_distribuicao')}
              />
            </div>
            <div>
              <Label htmlFor="prazo_proximo">Próximo Prazo</Label>
              <Input
                id="prazo_proximo"
                type="date"
                {...register('prazo_proximo')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor_causa">Valor da Causa (R$)</Label>
              <Input
                id="valor_causa"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('valor_causa', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="valor_condenacao">Valor da Condenação (R$)</Label>
              <Input
                id="valor_condenacao"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('valor_condenacao', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="juizo">Juízo</Label>
              <Input
                id="juizo"
                placeholder="Ex: 1ª Vara Cível"
                {...register('juizo')}
                maxLength={200}
              />
            </div>
            <div>
              <Label htmlFor="fase_processual">Fase Processual</Label>
              <Input
                id="fase_processual"
                placeholder="Ex: Conhecimento, Execução"
                {...register('fase_processual')}
                maxLength={100}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="link_tribunal">Link do Tribunal</Label>
            <Input
              id="link_tribunal"
              type="url"
              placeholder="https://"
              {...register('link_tribunal')}
            />
            {watch('link_tribunal') && (
              <a 
                href={watch('link_tribunal')} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline mt-1 inline-block"
              >
                Abrir no tribunal →
              </a>
            )}
          </div>

          <EtiquetasManager
            selectedEtiquetas={watch('etiquetas') || []}
            onChange={(etiquetas) => setValue('etiquetas', etiquetas)}
          />

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações adicionais sobre o processo"
              rows={4}
              {...register('observacoes')}
              maxLength={5000}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/controladoria')}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleSaveDraft}
          disabled={isSavingDraft}
        >
          {isSavingDraft ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Rascunho
            </>
          )}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <FileCheck className="mr-2 h-4 w-4" />
              Salvar e Abrir
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default ProcessoForm;
