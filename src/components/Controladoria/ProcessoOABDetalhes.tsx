import { useState, useMemo, useEffect, useRef } from 'react';
import { isProcessoSigiloso as isProcessoSigilosoHelper } from '@/utils/processoOABHelpers';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Bell, 
  BellOff, 
  ExternalLink, 
  FileText, 
  Users, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Scale,
  Gavel,
  Calendar,
  DollarSign,
  Shield,
  Building2,
  BookOpen,
  RefreshCw,
  ClipboardList,
  Bot,
  Paperclip,
  AlertTriangle,
  Download,
  MessageSquareWarning,
  Pencil,
  X,
  Save,
  Plus,
  Trash2
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProcessoOAB, OABCadastrada, useAndamentosOAB } from '@/hooks/useOABs';
import { TarefasTab } from './TarefasTab';
import { VoutiIATab } from './VoutiIATab';
import { AndamentoAnexos } from './AndamentoAnexos';
import { IntimacaoCard } from './IntimacaoCard';
import { MovimentacaoDetalhe, MovimentacaoSelecionada } from './MovimentacaoDetalhe';
import { useProcessoAnexos } from '@/hooks/useProcessoAnexos';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { parseIntimacao, countIntimacoesUrgentes } from '@/utils/intimacaoParser';
import AutomacaoPrazosCard from './AutomacaoPrazosCard';
import ApartadoCard from './ApartadoCard';
import { ProcessoApartadoBranch } from './ProcessoApartadoBranch';
import { useCanUseApartados } from '@/hooks/useCanUseApartados';
import { PrazosCasoTab } from './PrazosCasoTab';
import { supabase } from '@/integrations/supabase/client';
import { useEscavadorBeta } from '@/hooks/useEscavadorBeta';
import { useAuth } from '@/contexts/AuthContext';
import { useJuditSystemNames } from '@/hooks/useJuditSystemNames';
import { toast } from '@/hooks/use-toast';

// Gate temporário: apenas este usuário pode editar a credencial Judit
// vinculada ao processo (regeneração manual de trackings na SOLVENZA).
const EDIT_CREDENCIAL_EMAIL = 'danieldemorais.e@gmail.com';

interface ProcessoOABDetalhesProps {
  processo: ProcessoOAB | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleMonitoramento: (processo: ProcessoOAB) => Promise<any>;
  onRefreshProcessos?: () => Promise<void>;
  onConsultarDetalhesRequest?: (processoId: string, requestId: string) => Promise<any>;
  onResetarProcesso?: (
    processoId: string,
    numeroCnj: string,
    opts?: { juditCustomerKey?: string | null; juditSystemName?: string | null }
  ) => Promise<any>;
  onAtualizarProcesso?: (processoId: string, dados: Partial<ProcessoOAB>) => Promise<boolean>;
  oab?: OABCadastrada | null;
  onSelecionarProcesso?: (processoId: string) => void;
}

// Interface para parte editável
interface ParteEditavel {
  id: string;
  nome: string;
  tipo: 'ATIVO' | 'PASSIVO' | 'OUTRO';
  documento: string;
  advogado_nome: string;
  advogado_oab: string;
}

// Traduzir person_type para portugues
const getTipoParteLabel = (personType: string | undefined): string => {
  if (!personType) return 'Tipo nao informado';
  const tipo = personType.toUpperCase();
  switch (tipo) {
    case 'ATIVO': return 'Autor';
    case 'PASSIVO': return 'Reu';
    case 'ADVOGADO': return 'Advogado';
    default: return personType;
  }
};

// Badge colorido por tipo
const getTipoParteBadgeVariant = (personType: string | undefined): "default" | "secondary" | "outline" | "destructive" => {
  if (!personType) return 'outline';
  const tipo = personType.toUpperCase();
  switch (tipo) {
    case 'ATIVO': return 'default';
    case 'PASSIVO': return 'secondary';
    case 'ADVOGADO': return 'outline';
    default: return 'outline';
  }
};

// Extrair OAB/CPF/CNPJ dos documentos
const getDocumentoInfo = (documents: any[] | undefined): string | null => {
  if (!documents || documents.length === 0) return null;
  
  const oab = documents.find(d => d.document_type?.toLowerCase() === 'oab');
  if (oab) return `OAB ${oab.document}`;
  
  const cpf = documents.find(d => d.document_type?.toLowerCase() === 'cpf');
  if (cpf) return `CPF: ${cpf.document}`;
  
  const cnpj = documents.find(d => d.document_type?.toLowerCase() === 'cnpj');
  if (cnpj) return `CNPJ: ${cnpj.document}`;
  
  return null;
};

// Formatar valor monetario
const formatValor = (valor: number | null | undefined): string | null => {
  if (!valor && valor !== 0) return null;
  return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Formatar data
const formatData = (data: string | null | undefined): string | null => {
  if (!data) return null;
  try {
    return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return data;
  }
};

// Extrair instancia
const getInstancia = (instance: number | undefined): string | null => {
  if (!instance) return null;
  return `${instance}a Instancia`;
};

// Extrair nivel de sigilo
const getSigilo = (secrecyLevel: number | undefined): string | null => {
  if (secrecyLevel === undefined || secrecyLevel === null) return null;
  return secrecyLevel === 0 ? 'Publico' : `Nivel ${secrecyLevel} (Sigiloso)`;
};

// Extrair classificacao principal
const getClassificacao = (capa: any): string | null => {
  if (!capa?.classifications || capa.classifications.length === 0) return null;
  return capa.classifications.map((c: any) => c.name).join(', ');
};

// Extrair assuntos
const getAssuntos = (capa: any): string | null => {
  if (!capa?.subjects || capa.subjects.length === 0) return null;
  return capa.subjects.map((s: any) => s.name).join(', ');
};

// Verificar se valor e valido para exibir
const isValidValue = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && (value.trim() === '' || value.toUpperCase() === 'NAO INFORMADO')) return false;
  return true;
};

export const ProcessoOABDetalhes = ({
  processo,
  open,
  onOpenChange,
  onToggleMonitoramento,
  onRefreshProcessos,
  onConsultarDetalhesRequest,
  onResetarProcesso,
  onAtualizarProcesso,
  oab,
  onSelecionarProcesso,
}: ProcessoOABDetalhesProps) => {
  const { andamentos, loading: loadingAndamentos, fetchAndamentos, marcarComoLida, marcarTodasComoLidas } = useAndamentosOAB(processo?.id || null);
  const { anexosPorStep, downloading, downloadAnexo } = useProcessoAnexos(processo?.id || null);
  const { user, tenantId } = useAuth();
  const { data: credenciaisJudit = [] } = useJuditSystemNames(tenantId);
  const { canUse: canUseApartados } = useCanUseApartados();
  const podeEditarCredencial =
    (user?.email || '').toLowerCase() === EDIT_CREDENCIAL_EMAIL;
  const [editandoCredencial, setEditandoCredencial] = useState(false);
  const [salvandoCredencial, setSalvandoCredencial] = useState(false);
  const [credencialDraft, setCredencialDraft] = useState<string>('__publico__');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [togglingMonitoramento, setTogglingMonitoramento] = useState(false);
  const { enabled: monitoramentoFeatureEnabled } = useFeatureFlag('escavador_monitoramento_enabled');
  const [refreshingAndamentos, setRefreshingAndamentos] = useState(false);
  const [confirmMonitoramentoOpen, setConfirmMonitoramentoOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const escavadorBeta = useEscavadorBeta();
  const [ativandoEscavador, setAtivandoEscavador] = useState(false);
  const [escavadorAtivo, setEscavadorAtivo] = useState<boolean | null>(null);
  const [escavadorImportado, setEscavadorImportado] = useState<boolean>(false);
  const [confirmEscavadorOpen, setConfirmEscavadorOpen] = useState(false);
  // Credencial escolhida para o reset (CNJ sigiloso): valor "__publico__"
  // significa sem credencial; senão é o id da credencial Judit do tenant.
  const [resetCredencialValue, setResetCredencialValue] = useState<string>('__publico__');
  const [confirmacaoFinalOpen, setConfirmacaoFinalOpen] = useState(false);
  const [tribunaisTagsMap, setTribunaisTagsMap] = useState<Map<string, { nome: string; cor: string | null }>>(new Map());

  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('super-admin-listar-tribunais-andamento', { body: {} });
        if (error) throw error;
        if (cancelado) return;
        const list = ((data as any)?.tribunais || []) as Array<{ slug: string; nome: string; cor: string | null }>;
        const m = new Map<string, { nome: string; cor: string | null }>();
        list.forEach((t) => { if (t?.slug) m.set(t.slug, { nome: t.nome, cor: t.cor ?? null }); });
        setTribunaisTagsMap(m);
      } catch (e) {
        // Falha silenciosa: badges caem para fallback (slug)
      }
    })();
    return () => { cancelado = true; };
  }, [open]);
  const [activeTab, setActiveTab] = useState("resumo");
  const [prazosRefreshKey, setPrazosRefreshKey] = useState(0);
  const [movimentacaoSelecionada, setMovimentacaoSelecionada] = useState<{
    mov: MovimentacaoSelecionada;
    stepId: string | null;
    anexoManual?: { bucket?: string | null; storage_path: string; nome?: string | null } | null;
  } | null>(null);

  const fecharSubdrawer = () => setMovimentacaoSelecionada(null);

  const sheetContentRef = useRef<HTMLDivElement>(null);

  // Fechar drawer ao dar duplo clique fora dele
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const content = sheetContentRef.current;
      if (content && !content.contains(target)) {
        onOpenChange(false);
      }
    };
    document.addEventListener('dblclick', handler);
    return () => document.removeEventListener('dblclick', handler);
  }, [open, onOpenChange]);

  const anexosDaMovSelecionada = movimentacaoSelecionada?.stepId
    ? (anexosPorStep.get(movimentacaoSelecionada.stepId) || [])
    : [];

  // Listener para evento de deadline criado
  useEffect(() => {
    const handler = () => {
      if (activeTab === 'prazos') setPrazosRefreshKey(k => k + 1);
    };
    window.addEventListener('deadline-created', handler);
    return () => window.removeEventListener('deadline-created', handler);
  }, [activeTab]);

  // Carregar status do monitoramento Escavador (apenas beta)
  useEffect(() => {
    if (!escavadorBeta || !processo?.id) {
      setEscavadorAtivo(null);
      setEscavadorImportado(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const tId = (tenantId ?? '') as string;

      // 1) Prioridade: monitoramento vinculado diretamente ao processo_oab
      const { data: oabMon } = await (supabase as any)
        .from('processo_oab_monitoramento_escavador')
        .select('monitoramento_ativo, escavador_data')
        .eq('processo_oab_id', processo.id)
        .eq('tenant_id', tId)
        .maybeSingle();

      let data: any = oabMon;

      // 2) Fallback: monitoramento antigo vinculado a processos pelo numero CNJ
      if (!data && processo.numero_cnj) {
        const { data: legacyMon } = await (supabase as any)
          .from('processo_monitoramento_escavador')
          .select('monitoramento_ativo, escavador_data')
          .eq('numero_cnj', processo.numero_cnj)
          .eq('tenant_id', tId)
          .maybeSingle();
        data = legacyMon;
      }

      if (!cancelled) {
        setEscavadorAtivo(!!data?.monitoramento_ativo);
        setEscavadorImportado(!!data?.escavador_data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [escavadorBeta, processo?.id, processo?.numero_cnj, tenantId]);

  const handleAtivarEscavador = async () => {
    setConfirmEscavadorOpen(false);
    setAtivandoEscavador(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'escavador-ativar-e-buscar',
        {
          body: {
            processoId: processo.id,
            numeroProcesso: processo.numero_cnj,
          },
        },
      );
      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.message || 'Falha ao ativar Escavador');
      }
      setEscavadorAtivo(true);
      toast({
        title: '✅ Escavador ativado',
        description: `${data.totalMovimentacoes ?? 0} movimentações sincronizadas.`,
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao ativar Escavador',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setAtivandoEscavador(false);
    }
  };

  const handleReprocessarResumo = async () => {
    setConfirmReparseOpen(false);
    setReprocessandoResumo(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'escavador-importar-processo',
        {
          body: {
            processoId: processo.id,
            numeroProcesso: processo.numero_cnj,
            tenantId: tenantId ?? null,
            reparseSomente: true,
          },
        },
      );
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao reprocessar');
      const oabIns = data?.andamentosOabInseridos ?? 0;
      const temCache = !!data?.temCacheMovs;
      toast({
        title: '✅ Resumo reprocessado',
        description: temCache
          ? `Capa atualizada do cache. ${oabIns} andamento(s) reinserido(s).`
          : 'Capa atualizada do cache. Sem movimentações em cache — use "Reimportar tudo" para buscar no Escavador (consulta paga).',
      });
      await onRefreshProcessos?.();
      await fetchAndamentos();
    } catch (err: any) {
      toast({
        title: 'Erro ao reprocessar',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setReprocessandoResumo(false);
    }
  };

  const handleReimportarTudo = async () => {
    setConfirmReparseOpen(false);
    setReprocessandoResumo(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'escavador-importar-processo',
        {
          body: {
            processoId: processo.id,
            numeroProcesso: processo.numero_cnj,
            tenantId: tenantId ?? null,
            ativarMonitoramento: false,
            reparseSomente: false,
            modo: 'completo',
          },
        },
      );
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao reimportar');
      const oabIns = data?.andamentosOabInseridos ?? 0;
      const cred = data?.creditosUtilizados ?? 0;
      const totalMovs = data?.totalMovsColetadas ?? 0;
      const movsStatus = data?.movimentacoesStatus ?? 'ok';
      toast({
        title: movsStatus === 'pending' ? '⚠️ Capa atualizada, andamentos pendentes' : '✅ Reimportação concluída',
        description:
          movsStatus === 'pending'
            ? `Capa importada, mas falha ao buscar andamentos: ${data?.movimentacoesError || 'erro desconhecido'}. Tente novamente em alguns minutos.`
            : `Capa + ${totalMovs} movimentações coletadas. ${oabIns} novo(s) andamento(s) inserido(s). Créditos: ${cred}.`,
        variant: movsStatus === 'pending' ? 'destructive' : undefined,
      });
      await onRefreshProcessos?.();
      await fetchAndamentos();
    } catch (err: any) {
      toast({
        title: 'Erro ao reimportar',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setReprocessandoResumo(false);
    }
  };

  // Estados de edição - Resumo
  const [editandoResumo, setEditandoResumo] = useState(false);
  const [salvandoResumo, setSalvandoResumo] = useState(false);
  const [reprocessandoResumo, setReprocessandoResumo] = useState(false);
  const [confirmReparseOpen, setConfirmReparseOpen] = useState(false);
  const [formResumo, setFormResumo] = useState({
    parte_ativa: '',
    parte_passiva: '',
    valor_causa: '',
    data_distribuicao: '',
    status_processual: '',
    fase_processual: '',
    juizo: '',
    link_tribunal: '',
    tribunal: '',
    tribunal_sigla: ''
  });

  // Estados de edição - Partes
  const [editandoPartes, setEditandoPartes] = useState(false);
  const [salvandoPartes, setSalvandoPartes] = useState(false);
  const [formPartes, setFormPartes] = useState<ParteEditavel[]>([]);

  // Memoizacoes ANTES do early return para evitar erro React #310
  const intimacoesUrgentes = useMemo(() => countIntimacoesUrgentes(andamentos), [andamentos]);
  const andamentosNaoLidos = andamentos.filter(a => !a.lida).length;
  const intimacoes = andamentos.filter(a => 
    a.descricao?.toLowerCase().includes('intimação') ||
    a.descricao?.toLowerCase().includes('intimacao')
  );
  const intimacoesNaoLidas = intimacoes.filter(a => !a.lida).length;

  // Popular formulário de resumo quando processo muda
  useEffect(() => {
    if (processo) {
      setFormResumo({
        parte_ativa: processo.parte_ativa || '',
        parte_passiva: processo.parte_passiva || '',
        valor_causa: processo.valor_causa?.toString() || '',
        data_distribuicao: processo.data_distribuicao || '',
        status_processual: processo.status_processual || '',
        fase_processual: processo.fase_processual || '',
        juizo: processo.juizo || '',
        link_tribunal: processo.link_tribunal || '',
        tribunal: processo.tribunal || '',
        tribunal_sigla: processo.tribunal_sigla || ''
      });
      
      // Popular partes editáveis
      if (processo.partes_completas && Array.isArray(processo.partes_completas)) {
        const partesEditaveis = processo.partes_completas
          .filter((p: any) => p.person_type?.toUpperCase() !== 'ADVOGADO')
          .map((p: any, idx: number) => ({
            id: `parte-${idx}`,
            nome: p.name || p.nome || '',
            tipo: (p.person_type?.toUpperCase() === 'PASSIVO' ? 'PASSIVO' : 
                   p.person_type?.toUpperCase() === 'ATIVO' ? 'ATIVO' : 'OUTRO') as 'ATIVO' | 'PASSIVO' | 'OUTRO',
            documento: getDocumentoInfo(p.documents) || '',
            advogado_nome: p.lawyers?.[0]?.name || '',
            advogado_oab: getDocumentoInfo(p.lawyers?.[0]?.documents) || ''
          }));
        setFormPartes(partesEditaveis);
      } else {
        setFormPartes([]);
      }
    }
  }, [processo]);

  // Resetar modo edição ao fechar drawer + setar contexto do processo
  useEffect(() => {
    if (open && processo) {
      (window as any).__currentProcessoOabId = processo.id;
    }
    if (!open) {
      setEditandoResumo(false);
      setEditandoPartes(false);
      delete (window as any).__currentProcessoOabId;
    }
  }, [open, processo]);

  // Buscar user id atual
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  if (!processo) return null;
  
  // Get instance from capa_completa for download
  const instancia = processo.capa_completa?.instance || 1;

  const handleToggleClick = () => {
    setConfirmMonitoramentoOpen(true);
  };

  const handleConfirmToggle = async () => {
    setConfirmMonitoramentoOpen(false);
    setTogglingMonitoramento(true);
    await onToggleMonitoramento(processo);
    setTogglingMonitoramento(false);
  };

  const handleRefreshAndamentos = async () => {
    if (!processo) return;
    // Pré-selecionar credencial atualmente salva no processo (se houver)
    const atual = processo.judit_customer_key || null;
    const match = atual
      ? credenciaisJudit.find((c) => c.customer_key === atual)
      : null;
    setResetCredencialValue(match?.id || '__publico__');
    setConfirmResetOpen(true);
  };

  const executarReset = async () => {
    if (!processo || !onResetarProcesso) return;
    setConfirmResetOpen(false);
    setRefreshingAndamentos(true);
    try {
      const credSel =
        resetCredencialValue && resetCredencialValue !== '__publico__'
          ? credenciaisJudit.find((c) => c.id === resetCredencialValue) || null
          : null;
      const result = await onResetarProcesso(processo.id, processo.numero_cnj, {
        juditCustomerKey: credSel?.customer_key ?? null,
        juditSystemName: credSel?.system_name ?? null,
      });
      await fetchAndamentos();
      if (result?.monitoramentoDesativado && onAtualizarProcesso) {
        await onAtualizarProcesso(processo.id, { monitoramento_ativo: false, tracking_id: null });
      }
    } finally {
      setRefreshingAndamentos(false);
    }
  };

  // Salvar Resumo
  const handleSalvarResumo = async () => {
    if (!onAtualizarProcesso) return;
    
    setSalvandoResumo(true);
    try {
      const dados: Partial<ProcessoOAB> = {
        parte_ativa: formResumo.parte_ativa || null,
        parte_passiva: formResumo.parte_passiva || null,
        valor_causa: formResumo.valor_causa ? parseFloat(formResumo.valor_causa) : null,
        data_distribuicao: formResumo.data_distribuicao || null,
        status_processual: formResumo.status_processual || null,
        fase_processual: formResumo.fase_processual || null,
        juizo: formResumo.juizo || null,
        link_tribunal: formResumo.link_tribunal || null,
        tribunal: formResumo.tribunal || null,
        tribunal_sigla: formResumo.tribunal_sigla || null
      };

      const sucesso = await onAtualizarProcesso(processo.id, dados);
      if (sucesso) {
        setEditandoResumo(false);
      }
    } finally {
      setSalvandoResumo(false);
    }
  };

  // Salvar Partes
  const handleSalvarPartes = async () => {
    if (!onAtualizarProcesso) return;
    
    setSalvandoPartes(true);
    try {
      // Converter formPartes para o formato partes_completas
      const partesCompletas = formPartes.map(p => ({
        name: p.nome,
        person_type: p.tipo,
        documents: p.documento ? [{ document_type: 'DOC', document: p.documento }] : [],
        lawyers: p.advogado_nome ? [{
          name: p.advogado_nome,
          documents: p.advogado_oab ? [{ document_type: 'OAB', document: p.advogado_oab }] : []
        }] : []
      }));

      // Extrair parte_ativa e parte_passiva dos nomes
      const autores = formPartes.filter(p => p.tipo === 'ATIVO').map(p => p.nome).filter(Boolean);
      const reus = formPartes.filter(p => p.tipo === 'PASSIVO').map(p => p.nome).filter(Boolean);

      const dados: Partial<ProcessoOAB> = {
        partes_completas: partesCompletas,
        parte_ativa: autores.join(', ') || null,
        parte_passiva: reus.join(', ') || null
      };

      const sucesso = await onAtualizarProcesso(processo.id, dados);
      if (sucesso) {
        setEditandoPartes(false);
      }
    } finally {
      setSalvandoPartes(false);
    }
  };

  // Adicionar nova parte
  const handleAdicionarParte = () => {
    setFormPartes(prev => [...prev, {
      id: `parte-${Date.now()}`,
      nome: '',
      tipo: 'ATIVO',
      documento: '',
      advogado_nome: '',
      advogado_oab: ''
    }]);
  };

  // Remover parte
  const handleRemoverParte = (id: string) => {
    setFormPartes(prev => prev.filter(p => p.id !== id));
  };

  // Atualizar parte
  const handleAtualizarParte = (id: string, campo: keyof ParteEditavel, valor: string) => {
    setFormPartes(prev => prev.map(p => 
      p.id === id ? { ...p, [campo]: valor } : p
    ));
  };
  
  // Extrair dados da capa_completa
  const capa = processo.capa_completa || {};

  // Verificar se processo é sigiloso (detecção ampliada — helper compartilhado)
  const isProcessoSigiloso = isProcessoSigilosoHelper(processo);
  const partesVazias = !processo.partes_completas || 
    !Array.isArray(processo.partes_completas) || 
    processo.partes_completas.length === 0;

  // Verificar se processo não foi encontrado na API
  const detalhes = processo.detalhes_completos || {};
  const isProcessoNaoEncontrado = capa?.code === 2 || detalhes?.code === 2 || detalhes?.message === 'LAWSUIT_NOT_FOUND' || capa?.message === 'LAWSUIT_NOT_FOUND';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={sheetContentRef}
        className="w-full sm:max-w-xl overflow-visible"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Subdrawer lateral - desliza saindo da borda esquerda do drawer principal */}
        {movimentacaoSelecionada && processo && (
          <div
            role="dialog"
            aria-label="Detalhe da movimentação"
            className="absolute top-0 h-full bg-background shadow-2xl z-50 animate-in slide-in-from-right duration-200 inset-x-0 w-full border-l md:inset-x-auto md:right-full md:w-[min(36rem,calc(100vw-2rem))] md:border-r md:border-l-0 md:z-40"
            onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); fecharSubdrawer(); } }}
          >
            <MovimentacaoDetalhe
              movimentacao={movimentacaoSelecionada.mov}
              anexos={anexosDaMovSelecionada}
              anexoManual={movimentacaoSelecionada.anexoManual ?? null}
              processoOabId={processo.id}
              numeroCnj={processo.numero_cnj}
              instancia={1}
              onClose={fecharSubdrawer}
              onMarcarLida={(id) => {
                marcarComoLida(id);
                setMovimentacaoSelecionada((prev) => prev ? { ...prev, mov: { ...prev.mov, lida: true } } : prev);
              }}
            />
          </div>
        )}
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Detalhes do Caso
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4 flex flex-col h-[calc(100vh-5rem)]">
          {/* Cabecalho com Numero + Valor + Badges */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-2">
            <p className="font-mono text-base font-semibold">{processo.numero_cnj}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {processo.tribunal_sigla && (
                <Badge variant="outline">{processo.tribunal_sigla}</Badge>
              )}
              {isValidValue(capa.state) && (
                <Badge variant="outline">{capa.state}</Badge>
              )}
              {isValidValue(capa.instance) && (
                <Badge variant="outline">{getInstancia(capa.instance)}</Badge>
              )}
              {isProcessoSigiloso && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  <Shield className="w-3 h-3 mr-1" />
                  Sigiloso
                </Badge>
              )}
            </div>
            {/* Valor da Causa em destaque */}
            {(processo.valor_causa || capa.amount) && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/50 mt-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-mono font-semibold text-green-600">
                  {formatValor(processo.valor_causa || capa.amount)}
                </span>
              </div>
            )}
          </div>

          {/* Área scrollável única — tudo abaixo do cabeçalho rola junto */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
          {/* Alerta de Processo Sigiloso */}
          {isProcessoSigiloso && !processo.monitoramento_ativo && (
            <Card className="p-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                    Processo em Segredo de Justiça
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    Por se tratar de um processo sigiloso, os andamentos e documentos não podem ser
                    consultados automaticamente. Por isso, o histórico completo do processo não será
                    exibido nesta tela.
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    O processo, porém, já está disponível para iniciar o{' '}
                    <strong>monitoramento</strong>, e novas movimentações serão acompanhadas normalmente
                    a partir da ativação.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Alerta de Processo Apartado */}
          {(processo as any).apartado && (
            <Card className="p-3 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="font-medium text-blue-800 dark:text-blue-200 text-sm">
                    Processo apartado
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    Por ser um apartado, não consultamos andamentos automaticamente via Escavador,
                    portanto este processo não terá histórico de andamentos sincronizado.
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    O <strong>monitoramento</strong> abaixo está disponível para iniciar, mas é
                    apenas visual: serve para acompanhar este processo no painel e registrar
                    movimentações manualmente.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Branch original ↔ apartado */}
          {processo.id && (processo as any).oab_id && (
            <ProcessoApartadoBranch
              processoId={processo.id}
              oabId={(processo as any).oab_id}
              numeroCnj={processo.numero_cnj}
              isApartado={!!(processo as any).apartado}
              onSelecionarProcesso={onSelecionarProcesso}
            />
          )}

          {/* Alerta de Processo Em Processamento */}
          {isProcessoNaoEncontrado && (
            <Card className="p-3 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-green-600 mt-0.5 shrink-0 animate-pulse" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200 text-sm">
                    Processo em processamento
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Seu processo está sendo processado. Ao finalizar, você será notificado.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Toggle de Monitoramento (sempre visível) */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {processo.monitoramento_ativo ? (
                  <Bell className="w-5 h-5 text-green-600" />
                ) : (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="monitoramento" className="font-medium">
                    Monitoramento Diario
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {(processo as any).apartado
                      ? 'Acompanhamento manual (apartado)'
                      : 'Receba atualizacoes automaticas'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {togglingMonitoramento && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                <Switch
                  id="monitoramento"
                  checked={processo.monitoramento_ativo}
                  onCheckedChange={handleToggleClick}
                  disabled={togglingMonitoramento}
                />
              </div>
            </div>

            {/* Credencial Judit vinculada */}
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    Credencial Judit
                  </p>
                  <p className="text-sm truncate">
                    {processo.judit_system_name ? (
                      <>
                        {processo.judit_system_name}
                        {processo.judit_customer_key && (
                          <span className="text-muted-foreground"> — {processo.judit_customer_key}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Público (sem credencial)</span>
                    )}
                  </p>
                </div>
                {podeEditarCredencial && !processo.monitoramento_ativo && !editandoCredencial && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const atual = credenciaisJudit.find(
                        (c) => c.customer_key === processo.judit_customer_key,
                      );
                      setCredencialDraft(atual?.id || '__publico__');
                      setEditandoCredencial(true);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                  </Button>
                )}
              </div>

              {podeEditarCredencial && processo.monitoramento_ativo && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Desative o monitoramento para trocar a credencial. Ao reativar, um novo tracking será criado.
                </p>
              )}

              {editandoCredencial && (
                <div className="mt-2 space-y-2">
                  <Select value={credencialDraft} onValueChange={setCredencialDraft}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__publico__">Público (sem credencial)</SelectItem>
                      {credenciaisJudit.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.system_name} — {c.customer_key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditandoCredencial(false)}
                      disabled={salvandoCredencial}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        setSalvandoCredencial(true);
                        const sel = credenciaisJudit.find((c) => c.id === credencialDraft);
                        const { error } = await supabase
                          .from('processos_oab')
                          .update({
                            judit_system_name: sel?.system_name ?? null,
                            judit_customer_key: sel?.customer_key ?? null,
                          })
                          .eq('id', processo.id);
                        setSalvandoCredencial(false);
                        if (error) {
                          toast({
                            title: 'Erro ao salvar credencial',
                            description: error.message,
                            variant: 'destructive',
                          });
                          return;
                        }
                        toast({
                          title: 'Credencial atualizada',
                          description: sel ? `${sel.system_name} — ${sel.customer_key}` : 'Público',
                        });
                        setEditandoCredencial(false);
                        onRefreshProcessos?.();
                      }}
                      disabled={salvandoCredencial}
                    >
                      {salvandoCredencial ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5 mr-1" />
                      )}
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
            </div>

          </Card>

          {/* Modal de Confirmacao de Monitoramento */}
          <AlertDialog open={confirmMonitoramentoOpen} onOpenChange={setConfirmMonitoramentoOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {processo.monitoramento_ativo ? 'Desativar Monitoramento?' : 'Ativar Monitoramento?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {(processo as any).apartado
                    ? (processo.monitoramento_ativo
                        ? 'O monitoramento visual será desativado. Nenhuma consulta é feita ao Escavador em apartados.'
                        : 'Processo apartado — o monitoramento é apenas visual. Nenhuma consulta será feita ao Escavador.')
                    : (processo.monitoramento_ativo
                        ? 'O monitoramento será desativado. O histórico de andamentos será mantido.'
                        : 'O monitoramento será ativado. Você receberá notificações automáticas de novos andamentos.')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmToggle}>
                  {processo.monitoramento_ativo ? 'Desativar' : 'Ativar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Confirmação de reprocessamento do resumo (Escavador cache) */}
          <AlertDialog open={confirmReparseOpen} onOpenChange={setConfirmReparseOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reprocessar resumo do Escavador?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-sm">
                    <p><strong>Reprocessar do cache</strong> (grátis): reextrai capa e replica andamentos a partir do cache do Escavador, sem nova cobrança.</p>
                    <p><strong>Reimportar tudo</strong> (com cobrança): consulta o Escavador novamente para baixar capa e movimentações do tribunal. Use quando o cache está incompleto.</p>
                    <p className="text-amber-600 dark:text-amber-400">⚠️ Edições manuais nos campos do resumo serão sobrescritas.</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReimportarTudo}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Reimportar tudo (cobrança)
                </AlertDialogAction>
                <AlertDialogAction onClick={handleReprocessarResumo}>
                  Reprocessar do cache
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Confirmação de reset/atualização forçada */}
          <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Atualizar andamentos e ressincronizar?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-sm">
                    <p>Esta ação vai:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Buscar andamentos atualizados direto do tribunal (consulta paga).</li>
                      <li>Adicionar apenas os andamentos novos (não duplica nem apaga os atuais).</li>
                      <li>Desativar o monitoramento diário — você precisará reativá-lo depois.</li>
                    </ul>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-medium">Credencial Judit (para processos sigilosos)</Label>
                <Select value={resetCredencialValue} onValueChange={setResetCredencialValue}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Escolha uma credencial..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__publico__">Público (sem credencial)</SelectItem>
                    {credenciaisJudit.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.apelido || c.system_name} — {c.system_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Apenas a credencial escolhida será enviada à Judit. Para destravar sigilo,
                  use a credencial vinculada ao tribunal correto.
                </p>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={executarReset}>Atualizar e ressincronizar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(val) => {
              setActiveTab(val);
              if (val === 'prazos') setPrazosRefreshKey(k => k + 1);
            }} className="flex-1 min-h-0 flex flex-col">
            <TabsList className="grid grid-cols-4 sm:grid-cols-7 w-full h-auto gap-0.5 p-1 overflow-visible">
              <TabsTrigger value="resumo" title="Resumo" className="text-[10px] sm:text-[11px] md:text-xs px-1 sm:px-1.5 py-1.5 min-w-0 whitespace-nowrap">Resumo</TabsTrigger>
              <TabsTrigger value="andamentos" title="Andamentos" className="relative overflow-visible text-[10px] sm:text-[11px] md:text-xs px-1 sm:px-1.5 pt-3 pb-1.5 min-w-0 whitespace-nowrap">
                {andamentosNaoLidos > 0 && (
                  <span className="absolute top-0.5 left-1/2 -translate-x-1/2 min-w-[14px] h-[14px] px-1 rounded-full bg-destructive/10 text-destructive text-[9px] font-medium leading-none flex items-center justify-center">
                    {andamentosNaoLidos > 99 ? '99+' : andamentosNaoLidos}
                  </span>
                )}
                <span className="block whitespace-nowrap">Andamentos</span>
              </TabsTrigger>
              <TabsTrigger value="partes" title="Partes" className="text-[10px] sm:text-[11px] md:text-xs px-1 sm:px-1.5 py-1.5 min-w-0 whitespace-nowrap">Partes</TabsTrigger>
              <TabsTrigger value="intimacoes" title="Intimações" className="relative overflow-visible text-[10px] sm:text-[11px] md:text-xs px-1 sm:px-1.5 pt-3 pb-1.5 min-w-0 whitespace-nowrap">
                {intimacoesUrgentes > 0 ? (
                  <span className="absolute top-0.5 left-1/2 -translate-x-1/2 min-w-[14px] h-[14px] px-1 rounded-full bg-destructive/15 text-destructive text-[9px] font-medium leading-none flex items-center justify-center animate-pulse">
                    {intimacoesUrgentes > 99 ? '99+' : intimacoesUrgentes}
                  </span>
                ) : intimacoesNaoLidas > 0 ? (
                  <span className="absolute top-0.5 left-1/2 -translate-x-1/2 min-w-[14px] h-[14px] px-1 rounded-full bg-destructive/10 text-destructive text-[9px] font-medium leading-none flex items-center justify-center">
                    {intimacoesNaoLidas > 99 ? '99+' : intimacoesNaoLidas}
                  </span>
                ) : null}
                <span className="block whitespace-nowrap">Intimações</span>
              </TabsTrigger>
              <TabsTrigger value="prazos" title="Prazos" className="text-[10px] sm:text-[11px] md:text-xs px-1 sm:px-1.5 py-1.5 min-w-0 whitespace-nowrap">
                Prazos
              </TabsTrigger>
              <TabsTrigger value="tarefas" title="Tarefas" className="text-[10px] sm:text-[11px] md:text-xs px-1 sm:px-1.5 py-1.5 min-w-0 whitespace-nowrap">Tarefas</TabsTrigger>
              <TabsTrigger value="vouti-ia" title="Vouti IA" className="text-[10px] sm:text-[11px] md:text-xs px-1 sm:px-1.5 py-1.5 min-w-0 whitespace-nowrap">
                <Bot className="w-3.5 h-3.5 mr-1 shrink-0" />
                IA
              </TabsTrigger>
            </TabsList>

            {/* Resumo - COM MODO EDIÇÃO */}
            <TabsContent value="resumo" className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="space-y-6 pr-4">
                  
                  {/* Barra de edição */}
                  {editandoResumo ? (
                    <Card className="p-3 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 sticky top-0 z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Pencil className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-800 dark:text-blue-200 text-sm">
                            Modo Edição
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setEditandoResumo(false)}
                            disabled={salvandoResumo}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={handleSalvarResumo}
                            disabled={salvandoResumo || !onAtualizarProcesso}
                          >
                            {salvandoResumo ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <Save className="w-4 h-4 mr-1" />
                            )}
                            Salvar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <div className="flex justify-end flex-wrap gap-2">
                      {escavadorImportado && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmReparseOpen(true)}
                          disabled={reprocessandoResumo}
                          title="Reprocessa o resumo usando o cache do Escavador, sem nova cobrança"
                        >
                          {reprocessandoResumo ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-1" />
                          )}
                          Reprocessar resumo
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setEditandoResumo(true)}
                        disabled={!onAtualizarProcesso}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  )}

                  {/* SECAO: PARTES */}
                  <SectionHeader icon={Users} title="Partes" />
                  <div className="space-y-3 pl-1">
                    {editandoResumo ? (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Parte Ativa (Autor)</Label>
                          <Textarea
                            value={formResumo.parte_ativa}
                            onChange={(e) => setFormResumo(prev => ({ ...prev, parte_ativa: e.target.value }))}
                            placeholder="Nome do autor..."
                            className="min-h-[60px]"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Parte Passiva (Réu)</Label>
                          <Textarea
                            value={formResumo.parte_passiva}
                            onChange={(e) => setFormResumo(prev => ({ ...prev, parte_passiva: e.target.value }))}
                            placeholder="Nome do réu..."
                            className="min-h-[60px]"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <InfoItem label="Parte Ativa (Autor)" value={processo.parte_ativa} />
                        <InfoItem label="Parte Passiva (Reu)" value={processo.parte_passiva} />
                        {isProcessoSigiloso && !processo.parte_ativa && !processo.parte_passiva && (
                          <p className="text-sm text-muted-foreground italic">
                            Informações das partes não disponíveis (processo sigiloso)
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <Separator />

                  {/* SECAO: DADOS DO PROCESSO */}
                  <SectionHeader icon={Scale} title="Dados do Processo" />
                  <div className="grid grid-cols-2 gap-3 pl-1">
                    {editandoResumo ? (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Valor da Causa (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formResumo.valor_causa}
                            onChange={(e) => setFormResumo(prev => ({ ...prev, valor_causa: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Data Distribuição</Label>
                          <Input
                            type="date"
                            value={formResumo.data_distribuicao}
                            onChange={(e) => setFormResumo(prev => ({ ...prev, data_distribuicao: e.target.value }))}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <InfoItem label="Valor da Causa" value={formatValor(processo.valor_causa || capa.amount)} highlight />
                        <InfoItem label="Data Distribuicao" value={formatData(processo.data_distribuicao || capa.distribution_date)} />
                      </>
                    )}
                    <InfoItem label="Area do Direito" value={capa.area} />
                    <InfoItem label="Sistema" value={capa.system} />
                  </div>
                  <div className="space-y-3 pl-1">
                    <InfoItem label="Classe/Tipo" value={getClassificacao(capa)} />
                    <InfoItem label="Assunto(s)" value={getAssuntos(capa)} />
                  </div>

                  <Separator />

                  {/* SECAO: LOCALIZACAO */}
                  <SectionHeader icon={MapPin} title="Localizacao" />
                  <div className="grid grid-cols-2 gap-3 pl-1">
                    {editandoResumo ? (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Tribunal</Label>
                          <Input
                            value={formResumo.tribunal}
                            onChange={(e) => setFormResumo(prev => ({ ...prev, tribunal: e.target.value }))}
                            placeholder="Nome do tribunal..."
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Sigla</Label>
                          <Input
                            value={formResumo.tribunal_sigla}
                            onChange={(e) => setFormResumo(prev => ({ ...prev, tribunal_sigla: e.target.value }))}
                            placeholder="Ex: TJSP"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <InfoItem label="Tribunal" value={processo.tribunal || capa.court?.name} />
                        <InfoItem label="Sigla" value={processo.tribunal_sigla || capa.court?.acronym} />
                      </>
                    )}
                    <InfoItem label="Estado" value={capa.state} />
                    <InfoItem label="Cidade" value={capa.city} />
                    <InfoItem label="Instancia" value={getInstancia(capa.instance)} />
                  </div>
                  <div className="space-y-3 pl-1">
                    {editandoResumo ? (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Juízo/Vara</Label>
                        <Input
                          value={formResumo.juizo}
                          onChange={(e) => setFormResumo(prev => ({ ...prev, juizo: e.target.value }))}
                          placeholder="Ex: 1ª Vara Cível de São Paulo"
                        />
                      </div>
                    ) : (
                      <InfoItem label="Juizo/Vara" value={processo.juizo || capa.county} />
                    )}
                  </div>

                  <Separator />

                  {/* SECAO: SITUACAO ATUAL */}
                  <SectionHeader icon={Gavel} title="Situacao Atual" />
                  <div className="grid grid-cols-2 gap-3 pl-1">
                    {editandoResumo ? (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Status</Label>
                          <Input
                            value={formResumo.status_processual}
                            onChange={(e) => setFormResumo(prev => ({ ...prev, status_processual: e.target.value }))}
                            placeholder="Ex: Ativo, Arquivado..."
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Fase</Label>
                          <Input
                            value={formResumo.fase_processual}
                            onChange={(e) => setFormResumo(prev => ({ ...prev, fase_processual: e.target.value }))}
                            placeholder="Ex: Conhecimento, Execução..."
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <InfoItem label="Status" value={processo.status_processual || capa.situation} />
                        <InfoItem label="Fase" value={processo.fase_processual} />
                      </>
                    )}
                    <InfoItem label="Juiz Responsavel" value={capa.judge} />
                    <InfoItem label="Sigilo" value={getSigilo(capa.secrecy_level)} />
                  </div>
                  <div className="pl-1">
                    <InfoItem 
                      label="Justica Gratuita" 
                      value={capa.free_justice !== undefined ? (capa.free_justice ? 'Sim' : 'Nao') : null} 
                    />
                  </div>

                  {/* SECAO: ULTIMO ANDAMENTO */}
                  {capa.last_step && (
                    <>
                      <Separator />
                      <SectionHeader icon={Clock} title="Ultimo Andamento" />
                      <Card className="p-3 bg-muted/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatData(capa.last_step.step_date)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{capa.last_step.content}</p>
                      </Card>
                    </>
                  )}

                  {/* SECAO: LINK TRIBUNAL */}
                  {editandoResumo ? (
                    <>
                      <Separator />
                      <div className="space-y-1 pl-1">
                        <Label className="text-xs text-muted-foreground">Link do Tribunal</Label>
                        <Input
                          type="url"
                          value={formResumo.link_tribunal}
                          onChange={(e) => setFormResumo(prev => ({ ...prev, link_tribunal: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                    </>
                  ) : isValidValue(processo.link_tribunal) && (
                    <>
                      <Separator />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(processo.link_tribunal!, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver no Tribunal
                      </Button>
                    </>
                  )}

                  {/* CARD DE AUTOMACAO DE PRAZOS */}
                  <Separator />
                  {canUseApartados && (
                    <>
                      <ApartadoCard processoOabId={processo.id} />
                    </>
                  )}
                  <AutomacaoPrazosCard
                    processoOabId={processo.id}
                    prazoAutomaticoAtivo={processo.prazo_automatico_ativo || false}
                    prazoAdvogadoResponsavelId={processo.prazo_advogado_responsavel_id || null}
                    prazoUsuariosMarcados={processo.prazo_usuarios_marcados || []}
                  />

                  {/* Processos Relacionados */}
                  {capa.related_lawsuits && capa.related_lawsuits.length > 0 && (
                    <>
                      <Separator />
                      <SectionHeader icon={BookOpen} title="Processos Relacionados" />
                      <div className="space-y-2 pl-1">
                        {capa.related_lawsuits.map((rel: any, idx: number) => (
                          <Card key={idx} className="p-2">
                            <p className="font-mono text-xs">{rel.code || rel.numero}</p>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Andamentos */}
            <TabsContent value="andamentos" className="mt-4 flex-1 min-h-0 flex flex-col">
              {andamentos.length === 0 ? (
                <div className="p-6 text-center space-y-2 border rounded-lg bg-muted/30 mb-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhum andamento disponível.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {andamentos.length} andamento(s)
                      </p>
                      {/* Botao de atualizar andamentos (gratuito se tiver request_id) */}
                      {onResetarProcesso && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleRefreshAndamentos}
                          disabled={refreshingAndamentos}
                          title="Atualizar andamentos (consulta nova ao tribunal)"
                        >
                          {refreshingAndamentos ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                    {andamentosNaoLidos > 0 && (
                      <Button variant="ghost" size="sm" onClick={marcarTodasComoLidas}>
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Marcar todas como lidas
                      </Button>
                    )}
                  </div>

                  <ScrollArea className="h-full flex-1 min-h-0">
                    {loadingAndamentos ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    ) : andamentos.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="w-8 h-8 mx-auto mb-2" />
                        <p>Nenhum andamento encontrado</p>
                      </div>
                    ) : (
                  <div className="space-y-3 pr-4">
                    {andamentos.map((andamento) => {
                      const stepId = andamento.dados_completos?.id || andamento.dados_completos?.step_id;
                      const anexosDoAndamento = stepId ? (anexosPorStep.get(stepId) || []) : [];
                      const temAnexos = anexosDoAndamento.length > 0;
                      const anexoManual = (andamento as any).dados_completos?.anexo as
                        | { bucket?: string; storage_path?: string; nome?: string }
                        | null
                        | undefined;
                      const isSigiloso = (andamento as any).dados_completos?.sigiloso === true;
                      const tribunalTag = (andamento as any).dados_completos?.tribunal_tag as string | null | undefined;
                      const tribunalInfo = tribunalTag ? tribunaisTagsMap.get(tribunalTag) : null;
                      
                      return (
                        <Card 
                          key={andamento.id} 
                          className={`p-3 cursor-pointer transition-colors ${
                            !andamento.lida ? 'bg-primary/5 border-primary/20' : ''
                          }`}
                           onClick={() => {
                             if (!andamento.lida) marcarComoLida(andamento.id);
                             const stepId = (andamento as any).dados_completos?.id || (andamento as any).dados_completos?.step_id || null;
                             const anexoManualRaw = (andamento as any).dados_completos?.anexo as
                               | { bucket?: string; storage_path?: string; nome?: string }
                               | null
                               | undefined;
                             const anexoManual = anexoManualRaw?.storage_path
                               ? { bucket: anexoManualRaw.bucket || null, storage_path: anexoManualRaw.storage_path, nome: anexoManualRaw.nome || null }
                               : null;
                             setMovimentacaoSelecionada({
                               mov: {
                                 id: andamento.id,
                                 descricao: andamento.descricao,
                                 data_movimentacao: andamento.data_movimentacao,
                                 tipo_movimentacao: (andamento as any).tipo_movimentacao || null,
                                 lida: andamento.lida,
                                 origem: 'andamento',
                               },
                               stepId,
                               anexoManual,
                             });
                           }}
                        >
                          <div className="flex items-start gap-2">
                            {!andamento.lida && (
                              <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-muted-foreground">
                                  {formatData(andamento.data_movimentacao) || 'Data nao informada'}
                                </span>
                                {andamento.tipo_movimentacao && (
                                  <Badge variant="outline" className="text-xs">
                                    {andamento.tipo_movimentacao}
                                  </Badge>
                                )}
                                {temAnexos && (
                                  <Badge variant="secondary" className="text-xs gap-1">
                                    <Paperclip className="w-2.5 h-2.5" />
                                    {anexosDoAndamento.length}
                                  </Badge>
                                )}
                                {isSigiloso && (
                                  <Badge variant="destructive" className="text-xs">
                                    Sigiloso
                                  </Badge>
                                )}
                                {tribunalTag && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                    style={tribunalInfo?.cor ? { borderColor: tribunalInfo.cor, color: tribunalInfo.cor } : undefined}
                                  >
                                    {tribunalInfo?.nome || tribunalTag}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm">{andamento.descricao}</p>
                              
                              {/* Anexo manual (super admin) */}
                              {anexoManual?.storage_path && (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const { data, error } = await supabase.storage
                                        .from(anexoManual.bucket || 'andamentos-manuais-docs')
                                        .createSignedUrl(anexoManual.storage_path!, 3600);
                                      if (error || !data?.signedUrl) throw error;
                                      window.open(data.signedUrl, '_blank');
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <Paperclip className="w-3 h-3" />
                                  {anexoManual.nome || 'Documento anexado'}
                                </button>
                              )}

                              {/* Inline attachments */}
                              {temAnexos && (
                                <AndamentoAnexos
                                  anexos={anexosDoAndamento}
                                  numeroCnj={processo.numero_cnj}
                                  instancia={instancia}
                                  downloading={downloading}
                                  onDownload={downloadAnexo}
                                />
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                    </div>
                  )}
                </ScrollArea>
              </>
              )}
          </TabsContent>

            {/* Intimacoes - Cards estruturados com deteccao inteligente */}
            <TabsContent value="intimacoes" className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-full">
                {intimacoes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquareWarning className="w-8 h-8 mx-auto mb-2" />
                    <p>Nenhuma intimacao encontrada</p>
                    <p className="text-xs mt-1">As intimacoes aparecerao aqui quando forem identificadas nos andamentos</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">
                          {intimacoes.length} intimacao(es)
                        </p>
                        {intimacoesUrgentes > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {intimacoesUrgentes} urgente(s)
                          </Badge>
                        )}
                      </div>
                      {intimacoesNaoLidas > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            intimacoes.filter(i => !i.lida).forEach(i => marcarComoLida(i.id));
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Marcar como lidas
                        </Button>
                      )}
                    </div>
                    <div className="space-y-3 pr-4">
                      {intimacoes.map((andamento) => {
                        const stepId = andamento.dados_completos?.id || andamento.dados_completos?.step_id;
                        const anexosDoAndamento = stepId ? (anexosPorStep.get(stepId) || []) : [];
                        
                        return (
                          <IntimacaoCard
                            key={andamento.id}
                            andamento={andamento}
                            processoOabId={processo.id}
                            numeroCnj={processo.numero_cnj}
                            instancia={instancia}
                            anexos={anexosDoAndamento}
                            downloading={downloading}
                            onDownload={downloadAnexo}
                            onMarcarLida={marcarComoLida}
                           onCardClick={() => {
                             const anexoManualRaw = (andamento as any).dados_completos?.anexo as
                               | { bucket?: string; storage_path?: string; nome?: string }
                               | null
                               | undefined;
                             const anexoManual = anexoManualRaw?.storage_path
                               ? { bucket: anexoManualRaw.bucket || null, storage_path: anexoManualRaw.storage_path, nome: anexoManualRaw.nome || null }
                               : null;
                             setMovimentacaoSelecionada({
                               mov: {
                                 id: andamento.id,
                                 descricao: andamento.descricao,
                                 data_movimentacao: andamento.data_movimentacao,
                                 tipo_movimentacao: (andamento as any).tipo_movimentacao || null,
                                 lida: andamento.lida,
                                 origem: 'intimacao',
                               },
                               stepId,
                               anexoManual,
                             });
                           }}
                          />
                        );
                      })}
                    </div>
                  </>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Partes - COM MODO EDIÇÃO */}
            <TabsContent value="partes" className="mt-4 flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="space-y-6 pr-4">
                  
                  {/* Barra de edição de partes */}
                  {editandoPartes ? (
                    <Card className="p-3 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 sticky top-0 z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Pencil className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-800 dark:text-blue-200 text-sm">
                            Editando Partes
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setEditandoPartes(false)}
                            disabled={salvandoPartes}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={handleSalvarPartes}
                            disabled={salvandoPartes || !onAtualizarProcesso}
                          >
                            {salvandoPartes ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <Save className="w-4 h-4 mr-1" />
                            )}
                            Salvar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <div className="flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setEditandoPartes(true)}
                        disabled={!onAtualizarProcesso}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  )}

                  {editandoPartes ? (
                    /* Modo edição de partes */
                    <>
                      {formPartes.map((parte, index) => (
                        <Card key={parte.id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <Badge variant={parte.tipo === 'ATIVO' ? 'default' : parte.tipo === 'PASSIVO' ? 'secondary' : 'outline'}>
                              Parte #{index + 1}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleRemoverParte(parte.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2 space-y-1">
                              <Label className="text-xs text-muted-foreground">Nome</Label>
                              <Input
                                value={parte.nome}
                                onChange={(e) => handleAtualizarParte(parte.id, 'nome', e.target.value)}
                                placeholder="Nome completo da parte..."
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Polo</Label>
                              <Select 
                                value={parte.tipo} 
                                onValueChange={(val) => handleAtualizarParte(parte.id, 'tipo', val)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ATIVO">Polo Ativo (Autor)</SelectItem>
                                  <SelectItem value="PASSIVO">Polo Passivo (Réu)</SelectItem>
                                  <SelectItem value="OUTRO">Outro</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">CPF/CNPJ</Label>
                              <Input
                                value={parte.documento}
                                onChange={(e) => handleAtualizarParte(parte.id, 'documento', e.target.value)}
                                placeholder="Documento..."
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Advogado</Label>
                              <Input
                                value={parte.advogado_nome}
                                onChange={(e) => handleAtualizarParte(parte.id, 'advogado_nome', e.target.value)}
                                placeholder="Nome do advogado..."
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">OAB</Label>
                              <Input
                                value={parte.advogado_oab}
                                onChange={(e) => handleAtualizarParte(parte.id, 'advogado_oab', e.target.value)}
                                placeholder="Ex: OAB 12345/SP"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                      
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleAdicionarParte}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Parte
                      </Button>
                    </>
                  ) : (
                    /* Modo visualização de partes */
                    processo.partes_completas && Array.isArray(processo.partes_completas) ? (
                      (() => {
                        const autores: any[] = [];
                        const reus: any[] = [];
                        const outros: any[] = [];
                        
                        processo.partes_completas.forEach((parte: any) => {
                          const tipo = parte.person_type?.toUpperCase();
                          if (tipo === 'ATIVO') {
                            autores.push(parte);
                          } else if (tipo === 'PASSIVO') {
                            reus.push(parte);
                          } else if (tipo !== 'ADVOGADO') {
                            outros.push(parte);
                          }
                        });

                        return (
                          <>
                            {/* POLO ATIVO (Autores) */}
                            {autores.length > 0 && (
                              <PoloSection 
                                titulo="Polo Ativo (Autores)" 
                                partes={autores} 
                                corBorda="border-blue-500"
                              />
                            )}

                            {/* POLO PASSIVO (Reus) */}
                            {reus.length > 0 && (
                              <PoloSection 
                                titulo="Polo Passivo (Reus)" 
                                partes={reus} 
                                corBorda="border-muted-foreground"
                              />
                            )}

                            {/* OUTROS PARTICIPANTES */}
                            {outros.length > 0 && (
                              <PoloSection 
                                titulo="Outros Participantes" 
                                partes={outros} 
                                corBorda="border-yellow-500"
                              />
                            )}

                            {/* Se nao houver partes agrupadas */}
                            {autores.length === 0 && reus.length === 0 && outros.length === 0 && (
                              <div className="text-center py-8 text-muted-foreground">
                                {isProcessoSigiloso ? (
                                  <>
                                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>Informações das partes não disponíveis</p>
                                    <p className="text-xs mt-1">Processo em segredo de justiça</p>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="mt-3"
                                      onClick={() => setEditandoPartes(true)}
                                      disabled={!onAtualizarProcesso}
                                    >
                                      <Pencil className="w-4 h-4 mr-1" />
                                      Preencher manualmente
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Users className="w-8 h-8 mx-auto mb-2" />
                                    <p>Nenhuma parte encontrada</p>
                                  </>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        {isProcessoSigiloso ? (
                          <>
                            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>Informações das partes não disponíveis</p>
                            <p className="text-xs mt-1">Processo em segredo de justiça</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-3"
                              onClick={() => setEditandoPartes(true)}
                              disabled={!onAtualizarProcesso}
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              Preencher manualmente
                            </Button>
                          </>
                        ) : (
                          <>
                            <Users className="w-8 h-8 mx-auto mb-2" />
                            <p>Informacoes de partes nao disponiveis</p>
                          </>
                        )}
                      </div>
                    )
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Vouti IA */}
            <TabsContent value="vouti-ia" className="mt-4 flex-1 min-h-0">
              <VoutiIATab processoOabId={processo.id} />
            </TabsContent>

            {/* Prazos */}
            <TabsContent value="prazos" className="mt-4 flex-1 min-h-0 overflow-y-auto">
              <PrazosCasoTab key={prazosRefreshKey} processoOabId={processo.id} />
            </TabsContent>

            {/* Tarefas */}
            <TabsContent value="tarefas" className="mt-4 flex-1 min-h-0 overflow-y-auto">
              <TarefasTab processo={processo} oab={oab || null} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Componente de cabecalho de secao
const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div className="flex items-center gap-2">
    <Icon className="w-4 h-4 text-muted-foreground" />
    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">{title}</h3>
  </div>
);

// Componente de item de informacao
const InfoItem = ({ label, value, highlight }: { label: string; value: string | null | undefined; highlight?: boolean }) => {
  if (!isValidValue(value)) return null;
  
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm ${highlight ? 'font-semibold text-green-600' : ''}`}>{value}</p>
    </div>
  );
};

// Componente de secao de polo (Ativo/Passivo)
const PoloSection = ({ 
  titulo, 
  partes, 
  corBorda 
}: { 
  titulo: string; 
  partes: any[]; 
  corBorda: string;
}) => {
  if (partes.length === 0) return null;
  
  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 pb-2 border-b-2 ${corBorda}`}>
        <Users className="w-4 h-4" />
        <h3 className="font-semibold text-sm uppercase tracking-wide">
          {titulo} ({partes.length})
        </h3>
      </div>
      {partes.map((parte, index) => (
        <ParteCard key={index} parte={parte} />
      ))}
    </div>
  );
};

// Componente de card de parte individual
const ParteCard = ({ parte }: { parte: any }) => (
  <Card className="p-3">
    <div className="flex items-start gap-2">
      <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="font-medium text-sm">{parte.name || parte.nome}</p>
          <Badge variant={getTipoParteBadgeVariant(parte.person_type)}>
            {getTipoParteLabel(parte.person_type)}
          </Badge>
        </div>
        {getDocumentoInfo(parte.documents) && (
          <p className="text-xs text-muted-foreground">
            {getDocumentoInfo(parte.documents)}
          </p>
        )}
        {parte.lawyers && parte.lawyers.length > 0 && (
          <div className="mt-2 pl-3 border-l-2 border-primary/30">
            <p className="text-xs font-medium mb-1 flex items-center gap-1">
              <Scale className="w-3 h-3" />
              Advogados ({parte.lawyers.length}):
            </p>
            {parte.lawyers.map((adv: any, i: number) => (
              <div key={i} className="flex items-center gap-1 text-xs py-0.5">
                <span>{adv.name}</span>
                {getDocumentoInfo(adv.documents) && (
                  <span className="text-muted-foreground">
                    - {getDocumentoInfo(adv.documents)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </Card>
);
