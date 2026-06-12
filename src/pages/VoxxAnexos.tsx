import { useEffect, useMemo, useState } from 'react';
import { supabasePublic } from '@/integrations/supabase/publicClient';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Row {
  processo_oab_id: string;
  numero_cnj: string | null;
  tribunal: string | null;
  tribunal_sigla: string | null;
  oab_numero: string | null;
  oab_uf: string | null;
  tenant_nome: string | null;
  total_anexos: number;
  ultimo_anexo_em: string | null;
}

const formatDate = (iso: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const VoxxAnexos = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    document.title = 'Processos com anexos disponíveis';
    (async () => {
      const { data, error } = await supabasePublic.rpc('get_public_processos_com_anexos');
      if (error) {
        setErro(error.message);
      } else {
        setRows((data as Row[]) || []);
      }
      setLoading(false);
    })();
  }, []);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.numero_cnj, r.oab_numero, r.oab_uf, r.tenant_nome, r.tribunal]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, busca]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Processos com documentos disponíveis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lista de processos alimentados pelo monitoramento com pelo menos um anexo
            visível para leitura.
          </p>
        </header>

        <div className="mb-4 flex items-center gap-3">
          <Input
            placeholder="Buscar por CNJ, OAB, tribunal ou escritório"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="max-w-md"
          />
          <span className="text-sm text-muted-foreground">
            {loading ? 'Carregando…' : `${filtradas.length} processo(s)`}
          </span>
        </div>

        {erro && (
          <div className="text-sm text-destructive mb-4">Erro ao carregar: {erro}</div>
        )}

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CNJ</TableHead>
                <TableHead>OAB</TableHead>
                <TableHead>Tribunal</TableHead>
                <TableHead>Escritório</TableHead>
                <TableHead className="text-right">Anexos</TableHead>
                <TableHead>Último anexo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : filtradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum processo encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtradas.map((r) => (
                  <TableRow key={r.processo_oab_id}>
                    <TableCell className="font-mono text-xs">{r.numero_cnj || '-'}</TableCell>
                    <TableCell>
                      {r.oab_numero ? `${r.oab_numero}/${r.oab_uf || ''}` : '-'}
                    </TableCell>
                    <TableCell>{r.tribunal_sigla || r.tribunal || '-'}</TableCell>
                    <TableCell>{r.tenant_nome || '-'}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.total_anexos}</TableCell>
                    <TableCell className="text-xs">{formatDate(r.ultimo_anexo_em)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default VoxxAnexos;