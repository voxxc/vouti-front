import { useEffect, useState } from 'react';
import { GitBranch } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ProcessoApartadoBranchProps {
  processoId: string;
  oabId: string;
  numeroCnj: string;
  isApartado: boolean;
  onSelecionarProcesso?: (processoId: string) => void;
}

interface Irmao {
  id: string;
  numero_cnj: string;
  apartado: boolean;
}

const getBaseCnj = (numero: string): string => {
  const limpo = (numero || '').replace(/\D/g, '');
  return limpo.slice(0, 20);
};

const getSufixo = (numero: string): string => {
  if (!numero) return '';
  const idx = numero.indexOf('/');
  return idx >= 0 ? numero.slice(idx + 1) : '';
};

export const ProcessoApartadoBranch = ({
  processoId,
  oabId,
  numeroCnj,
  isApartado,
  onSelecionarProcesso,
}: ProcessoApartadoBranchProps) => {
  const [irmaos, setIrmaos] = useState<Irmao[]>([]);
  const [loading, setLoading] = useState(true);

  const base = getBaseCnj(numeroCnj);

  useEffect(() => {
    let ativo = true;
    if (!oabId || !base || base.length < 20) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      // Buscar pelos primeiros 20 dígitos do CNJ na mesma OAB.
      // Como `numero_cnj` pode vir mascarado (pontos/traços) ou sem máscara,
      // filtramos depois em JS pela base limpa.
      const { data, error } = await supabase
        .from('processos_oab')
        .select('id, numero_cnj, apartado')
        .eq('oab_id', oabId);
      if (!ativo) return;
      if (error || !data) {
        setIrmaos([]);
      } else {
        const filtrados = (data as any[])
          .filter((p) => getBaseCnj(p.numero_cnj) === base)
          .map((p) => ({ id: p.id, numero_cnj: p.numero_cnj, apartado: !!p.apartado }));
        setIrmaos(filtrados);
      }
      setLoading(false);
    })();
    return () => {
      ativo = false;
    };
  }, [oabId, base]);

  if (loading || irmaos.length < 2) return null;

  const original = irmaos.find((p) => !p.apartado);
  const apartados = irmaos.filter((p) => p.apartado);

  // Formata base CNJ no padrão NNNNNNN-DD.AAAA.J.TT.OOOO
  const baseFormatada = base.length === 20
    ? `${base.slice(0, 7)}-${base.slice(7, 9)}.${base.slice(9, 13)}.${base.slice(13, 14)}.${base.slice(14, 16)}.${base.slice(16, 20)}`
    : base;

  const renderRow = (
    label: string,
    id: string | null,
    atual: boolean,
    indent: number,
    isApartadoRow: boolean,
  ) => {
    const clicavel = !!id && !atual && !!onSelecionarProcesso;
    return (
      <button
        type="button"
        disabled={!clicavel}
        onClick={() => clicavel && id && onSelecionarProcesso?.(id)}
        className={cn(
          'w-full flex items-center gap-2 text-left rounded-md px-2 py-1.5 text-sm transition-colors',
          clicavel ? 'hover:bg-muted cursor-pointer' : 'cursor-default',
          atual && 'bg-primary/10',
        )}
        style={{ paddingLeft: 8 + indent * 16 }}
      >
        {indent > 0 && (
          <span className="text-muted-foreground font-mono text-xs select-none">└─</span>
        )}
        <span className={cn('font-mono', atual ? 'font-semibold' : 'text-muted-foreground')}>
          {label}
        </span>
        {isApartadoRow && (
          <Badge variant="outline" className="text-[10px] h-5">apartado</Badge>
        )}
        {atual && (
          <Badge variant="secondary" className="ml-auto text-[10px] h-5">atual</Badge>
        )}
      </button>
    );
  };

  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Estrutura do processo</span>
      </div>
      <div className="space-y-0.5">
        {/* Raiz: o original (se existir) ou apenas o CNJ base como rótulo */}
        {original
          ? renderRow(baseFormatada, original.id, original.id === processoId, 0, false)
          : (
            <div
              className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-md"
              style={{ paddingLeft: 8 }}
            >
              <span className="font-mono text-muted-foreground italic">
                {baseFormatada}
              </span>
              <Badge variant="outline" className="text-[10px] h-5">não cadastrado</Badge>
            </div>
          )}
        {apartados.map((ap) => {
          const sufixo = getSufixo(ap.numero_cnj);
          const label = sufixo || ap.numero_cnj;
          return (
            <div key={ap.id}>
              {renderRow(label, ap.id, ap.id === processoId, 1, true)}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
