import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface SetorPerformance {
  setor: string;
  opsProcessadas: number;
  opsAtivas: number;
  tempoMedio: number;
  ultimaAtividade: string | null;
}

export const SetorPerformanceTable = () => {
  const [data, setData] = useState<SetorPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: flows, error } = await supabase
        .from('metal_setor_flow')
        .select('setor, entrada, saida, created_at');

      if (error) throw error;

      const setorStats: { [key: string]: SetorPerformance } = {};

      flows?.forEach(flow => {
        if (!setorStats[flow.setor]) {
          setorStats[flow.setor] = {
            setor: flow.setor,
            opsProcessadas: 0,
            opsAtivas: 0,
            tempoMedio: 0,
            ultimaAtividade: null
          };
        }

        // Contar OPs processadas (com saída)
        if (flow.saida) {
          setorStats[flow.setor].opsProcessadas += 1;

          // Calcular tempo médio
          if (flow.entrada && flow.saida) {
            const inicio = new Date(flow.entrada).getTime();
            const fim = new Date(flow.saida).getTime();
            const horas = (fim - inicio) / (1000 * 60 * 60);
            setorStats[flow.setor].tempoMedio += horas;
          }
        } else {
          // Contar OPs ativas (sem saída)
          setorStats[flow.setor].opsAtivas += 1;
        }

        // Última atividade
        if (!setorStats[flow.setor].ultimaAtividade || 
            new Date(flow.created_at) > new Date(setorStats[flow.setor].ultimaAtividade!)) {
          setorStats[flow.setor].ultimaAtividade = flow.created_at;
        }
      });

      // Calcular média de tempo
      const tableData = Object.values(setorStats).map(stat => ({
        ...stat,
        tempoMedio: stat.opsProcessadas > 0 
          ? Math.round(stat.tempoMedio / stat.opsProcessadas) 
          : 0
      })).sort((a, b) => b.opsProcessadas - a.opsProcessadas);

      setData(tableData);
    } catch (error) {
      console.error('Erro ao buscar dados de performance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Performance por Setor</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead className="text-slate-300">Setor</TableHead>
              <TableHead className="text-slate-300 text-center">OPs Processadas</TableHead>
              <TableHead className="text-slate-300 text-center">OPs Ativas</TableHead>
              <TableHead className="text-slate-300 text-center">Tempo Médio (h)</TableHead>
              <TableHead className="text-slate-300">Última Atividade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.setor} className="border-slate-700 hover:bg-slate-700/50">
                <TableCell className="text-white font-medium">{row.setor}</TableCell>
                <TableCell className="text-slate-300 text-center">{row.opsProcessadas}</TableCell>
                <TableCell className="text-slate-300 text-center">
                  <span className={row.opsAtivas > 0 ? "text-blue-400" : "text-slate-500"}>
                    {row.opsAtivas}
                  </span>
                </TableCell>
                <TableCell className="text-slate-300 text-center">{row.tempoMedio}h</TableCell>
                <TableCell className="text-slate-400">
                  {row.ultimaAtividade 
                    ? format(new Date(row.ultimaAtividade), 'dd/MM/yyyy HH:mm')
                    : '-'
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
