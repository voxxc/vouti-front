import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useTenant } from "@/contexts/TenantContext";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { parseLocalDate } from "@/lib/dateUtils";

interface ControleCliente {
  id: string;
  cliente: string | null;
  placa: string | null;
  renavam: string | null;
  cnh: string | null;
  cpf_cnpj: string | null;
  validade_cnh: string | null;
  proximo_prazo: string | null;
  obs: string | null;
  ultima_consulta: string | null;
}

function calcularTempoSemConsultar(ultimaConsulta: string | null): string {
  if (!ultimaConsulta) return "—";
  const hoje = new Date();
  const consulta = parseLocalDate(ultimaConsulta);
  const diffMs = hoje.getTime() - consulta.getTime();
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (dias < 0) return "0 dias";
  if (dias === 1) return "1 dia";
  return `${dias} dias`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString("pt-BR");
}

export function ControleTab() {
  const { tenant } = useTenant();
  const { tenantId } = useTenantId(tenant?.id);
  const [data, setData] = useState<ControleCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: rows } = await supabase
        .from("controle_clientes")
        .select("id, cliente, placa, renavam, cnh, cpf_cnpj, validade_cnh, proximo_prazo, obs, ultima_consulta")
        .eq("tenant_id", tenantId)
        .order("cliente");
      setData((rows as ControleCliente[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (r) =>
        r.cliente?.toLowerCase().includes(q) ||
        r.placa?.toLowerCase().includes(q) ||
        r.cpf_cnpj?.toLowerCase().includes(q)
    );
  }, [data, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente, placa ou CPF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="text-xs text-muted-foreground">
        {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Cliente</TableHead>
              <TableHead className="min-w-[90px]">Placa</TableHead>
              <TableHead className="min-w-[110px]">Renavam</TableHead>
              <TableHead className="min-w-[120px]">CNH</TableHead>
              <TableHead className="min-w-[140px]">CPF/CNPJ</TableHead>
              <TableHead className="min-w-[110px]">Val. CNH</TableHead>
              <TableHead className="min-w-[120px]">Próx. Prazo</TableHead>
              <TableHead className="min-w-[200px]">OBS</TableHead>
              <TableHead className="min-w-[110px]">Últ. Consulta</TableHead>
              <TableHead className="min-w-[120px]">Tempo s/ consultar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.cliente || "—"}</TableCell>
                  <TableCell>{row.placa || "—"}</TableCell>
                  <TableCell>{row.renavam || "—"}</TableCell>
                  <TableCell>{row.cnh || "—"}</TableCell>
                  <TableCell>{row.cpf_cnpj || "—"}</TableCell>
                  <TableCell>{formatDate(row.validade_cnh)}</TableCell>
                  <TableCell>{row.proximo_prazo || "—"}</TableCell>
                  <TableCell className="max-w-[250px] truncate" title={row.obs || ""}>{row.obs || "—"}</TableCell>
                  <TableCell>{formatDate(row.ultima_consulta)}</TableCell>
                  <TableCell>{calcularTempoSemConsultar(row.ultima_consulta)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
