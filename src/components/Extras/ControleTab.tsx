import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useTenant } from "@/contexts/TenantContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, CalendarIcon, Trash2 } from "lucide-react";
import { parseLocalDate } from "@/lib/dateUtils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

function getDiasDesdeConsulta(ultimaConsulta: string | null): number | null {
  if (!ultimaConsulta) return null;
  const hoje = new Date();
  const consulta = parseLocalDate(ultimaConsulta);
  return Math.floor((hoje.getTime() - consulta.getTime()) / (1000 * 60 * 60 * 24));
}

function getTempoLabel(dias: number | null): string {
  if (dias === null) return "—";
  if (dias < 0) return "0 dias";
  return `${dias} dia${dias !== 1 ? "s" : ""}`;
}

function getTempoColor(dias: number | null): string {
  if (dias === null) return "";
  if (dias >= 27) return "bg-red-100 text-red-800";
  if (dias >= 21) return "bg-orange-100 text-orange-800";
  if (dias >= 15) return "bg-yellow-100 text-yellow-800";
  return "";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString("pt-BR");
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Inline editable text cell
function EditableCell({
  value,
  rowId,
  field,
  onSave,
  className,
}: {
  value: string | null;
  rowId: string;
  field: string;
  onSave: (id: string, field: string, val: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setText(value || ""); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = () => {
    setEditing(false);
    if (text !== (value || "")) onSave(rowId, field, text);
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setText(value || ""); setEditing(false); } }}
        className="h-7 text-xs px-1"
      />
    );
  }

  return (
    <span
      className={cn("cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 block min-h-[1.5rem]", className)}
      onClick={() => setEditing(true)}
      title="Clique para editar"
    >
      {value || "—"}
    </span>
  );
}

// Inline editable date cell
function EditableDateCell({
  value,
  rowId,
  field,
  onSave,
}: {
  value: string | null;
  rowId: string;
  field: string;
  onSave: (id: string, field: string, val: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseLocalDate(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span className="cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 flex items-center gap-1 min-h-[1.5rem]" title="Clique para editar">
          {formatDate(value)}
          <CalendarIcon className="h-3 w-3 text-muted-foreground" />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onSave(rowId, field, toDateString(date));
            }
            setOpen(false);
          }}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

export function ControleTab() {
  const { tenant } = useTenant();
  const { tenantId } = useTenantId(tenant?.id);
  const [data, setData] = useState<ControleCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmRowId, setConfirmRowId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<"single" | "bulk" | null>(null);
  const [deleteRowId, setDeleteRowId] = useState<string | null>(null);

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

  const updateField = async (id: string, field: string, val: string | null) => {
    const { error } = await supabase
      .from("controle_clientes")
      .update({ [field]: val || null })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao salvar");
      return;
    }
    setData((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val || null } : r)));
  };

  const confirmConsultaHoje = async () => {
    if (!confirmRowId) return;
    const hoje = toDateString(new Date());
    await updateField(confirmRowId, "ultima_consulta", hoje);
    setConfirmRowId(null);
    toast.success("Consulta registrada para hoje");
  };

  const addNewRow = async () => {
    if (!tenantId) return;
    const { data: newRow, error } = await supabase
      .from("controle_clientes")
      .insert({ tenant_id: tenantId })
      .select("id, cliente, placa, renavam, cnh, cpf_cnpj, validade_cnh, proximo_prazo, obs, ultima_consulta")
      .single();
    if (error || !newRow) {
      toast.error("Erro ao criar registro");
      return;
    }
    setData((prev) => [newRow as ControleCliente, ...prev]);
    toast.success("Novo registro criado");
  };

  // Delete single row
  const deleteSingleRow = async () => {
    if (!deleteRowId) return;
    const { error } = await supabase.from("controle_clientes").delete().eq("id", deleteRowId);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    setData((prev) => prev.filter((r) => r.id !== deleteRowId));
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(deleteRowId); return n; });
    setDeleteRowId(null);
    setDeleteTarget(null);
    toast.success("Registro excluído");
  };

  // Delete selected rows
  const deleteBulk = async () => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("controle_clientes").delete().in("id", ids);
    if (error) {
      toast.error("Erro ao excluir registros");
      return;
    }
    setData((prev) => prev.filter((r) => !selectedIds.has(r.id)));
    setSelectedIds(new Set());
    setDeleteTarget(null);
    toast.success(`${ids.length} registro(s) excluído(s)`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    const filteredIds = filtered.map((r) => r.id);
    const allSelected = filteredIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => { const n = new Set(prev); filteredIds.forEach((id) => n.delete(id)); return n; });
    } else {
      setSelectedIds((prev) => { const n = new Set(prev); filteredIds.forEach((id) => n.add(id)); return n; });
    }
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Actions */}
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente, placa ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button size="icon" variant="outline" onClick={addNewRow} title="Novo registro">
          <Plus className="h-4 w-4" />
        </Button>
        {selectedIds.size > 0 && (
          <Button
            size="icon"
            variant="destructive"
            onClick={() => setDeleteTarget("bulk")}
            title={`Excluir ${selectedIds.size} selecionado(s)`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
        {selectedIds.size > 0 && ` · ${selectedIds.size} selecionado${selectedIds.size !== 1 ? "s" : ""}`}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={toggleSelectAll}
                  title="Selecionar todos"
                />
              </TableHead>
              <TableHead className="min-w-[200px]">Cliente</TableHead>
              <TableHead className="min-w-[90px]">Placa</TableHead>
              <TableHead className="min-w-[110px]">Renavam</TableHead>
              <TableHead className="min-w-[120px]">CNH</TableHead>
              <TableHead className="min-w-[140px]">CPF/CNPJ</TableHead>
              <TableHead className="min-w-[110px]">Val. CNH</TableHead>
              <TableHead className="min-w-[120px]">Próx. Prazo</TableHead>
              <TableHead className="min-w-[200px]">OBS</TableHead>
              <TableHead className="min-w-[130px]">Últ. Consulta</TableHead>
              <TableHead className="min-w-[160px]">Tempo s/ consultar</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => {
                const dias = getDiasDesdeConsulta(row.ultima_consulta);
                const corClasse = getTempoColor(dias);
                return (
                  <TableRow key={row.id} data-state={selectedIds.has(row.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={() => toggleSelect(row.id)}
                      />
                    </TableCell>
                    <TableCell><EditableCell value={row.cliente} rowId={row.id} field="cliente" onSave={updateField} className="font-medium" /></TableCell>
                    <TableCell><EditableCell value={row.placa} rowId={row.id} field="placa" onSave={updateField} /></TableCell>
                    <TableCell><EditableCell value={row.renavam} rowId={row.id} field="renavam" onSave={updateField} /></TableCell>
                    <TableCell><EditableCell value={row.cnh} rowId={row.id} field="cnh" onSave={updateField} /></TableCell>
                    <TableCell><EditableCell value={row.cpf_cnpj} rowId={row.id} field="cpf_cnpj" onSave={updateField} /></TableCell>
                    <TableCell><EditableDateCell value={row.validade_cnh} rowId={row.id} field="validade_cnh" onSave={updateField} /></TableCell>
                    <TableCell><EditableCell value={row.proximo_prazo} rowId={row.id} field="proximo_prazo" onSave={updateField} /></TableCell>
                    <TableCell className="max-w-[250px]"><EditableCell value={row.obs} rowId={row.id} field="obs" onSave={updateField} /></TableCell>
                    <TableCell><EditableDateCell value={row.ultima_consulta} rowId={row.id} field="ultima_consulta" onSave={updateField} /></TableCell>
                    <TableCell className={cn("rounded", corClasse)}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getTempoLabel(dias)}</span>
                        <Checkbox
                          checked={false}
                          onCheckedChange={() => setConfirmRowId(row.id)}
                          title="Marcar consulta como hoje"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => { setDeleteRowId(row.id); setDeleteTarget("single"); }}
                        title="Excluir registro"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirm Consulta Dialog */}
      <AlertDialog open={!!confirmRowId} onOpenChange={(open) => { if (!open) setConfirmRowId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar consulta</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja registrar a consulta como realizada hoje ({new Date().toLocaleDateString("pt-BR")})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmConsultaHoje}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteRowId(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === "bulk"
                ? `Deseja excluir ${selectedIds.size} registro(s) selecionado(s)? Esta ação não pode ser desfeita.`
                : "Deseja excluir este registro? Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteTarget === "bulk" ? deleteBulk : deleteSingleRow}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
