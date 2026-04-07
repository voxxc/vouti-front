import { useState } from 'react';
import { Search, Loader2, FileText, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0,3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`;
  return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
}

interface Processo {
  lawsuit_cnj?: string;
  number?: string;
  court?: string;
  tribunal?: string;
  status?: string;
  active_parties?: Array<{ name?: string }>;
  passive_parties?: Array<{ name?: string }>;
  parties?: Array<{ name?: string; type?: string }>;
  [key: string]: unknown;
}

export function SuperAdminBuscaProcessosCPF() {
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const handleSearch = async () => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) {
      toast({ title: 'CPF inválido', description: 'Digite um CPF com 11 dígitos', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setProcessos([]);
    setTotal(null);
    setExpandedRows(new Set());

    try {
      const { data, error } = await supabase.functions.invoke('judit-buscar-processos-cpf', {
        body: { cpf: digits },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setProcessos(data.processos || []);
      setTotal(data.total ?? 0);
      toast({ title: 'Busca concluída', description: `${data.total || 0} processo(s) encontrado(s)` });
    } catch (err: any) {
      toast({ title: 'Erro na busca', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const getCNJ = (p: Processo) => p.lawsuit_cnj || p.number || '—';
  const getCourt = (p: Processo) => p.court || p.tribunal || '—';
  
  const getParties = (p: Processo, type: 'active' | 'passive') => {
    if (type === 'active' && p.active_parties?.length) {
      return p.active_parties.map(pt => pt.name).filter(Boolean).join(', ');
    }
    if (type === 'passive' && p.passive_parties?.length) {
      return p.passive_parties.map(pt => pt.name).filter(Boolean).join(', ');
    }
    if (p.parties?.length) {
      return p.parties
        .filter(pt => pt.type?.toLowerCase().includes(type === 'active' ? 'ativ' : 'passiv'))
        .map(pt => pt.name)
        .filter(Boolean)
        .join(', ');
    }
    return '—';
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Busca de Processos por CPF</h2>
        <p className="text-muted-foreground">
          Consulte todos os processos judiciais associados a um CPF via Judit
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Consultar CPF
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1 max-w-xs">
              <Input
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(maskCPF(e.target.value))}
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              {loading ? 'Buscando...' : 'Buscar Processos'}
            </Button>
          </div>
          {loading && (
            <p className="text-sm text-muted-foreground mt-3">
              A busca pode levar até 90 segundos. Aguarde...
            </p>
          )}
        </CardContent>
      </Card>

      {total !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resultados
              <Badge variant="secondary" className="ml-2">{total} processo(s)</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {processos.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum processo encontrado para este CPF.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>CNJ</TableHead>
                    <TableHead>Polo Ativo</TableHead>
                    <TableHead>Polo Passivo</TableHead>
                    <TableHead>Tribunal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processos.map((processo, idx) => (
                    <Collapsible key={idx} open={expandedRows.has(idx)} onOpenChange={() => toggleRow(idx)} asChild>
                      <>
                        <CollapsibleTrigger asChild>
                          <TableRow className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              {expandedRows.has(idx) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{getCNJ(processo)}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">{getParties(processo, 'active')}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">{getParties(processo, 'passive')}</TableCell>
                            <TableCell className="text-sm">{getCourt(processo)}</TableCell>
                          </TableRow>
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={5} className="bg-muted/30 p-4">
                              <pre className="text-xs overflow-auto max-h-64 whitespace-pre-wrap break-all">
                                {JSON.stringify(processo, null, 2)}
                              </pre>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
