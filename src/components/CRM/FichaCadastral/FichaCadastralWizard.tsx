import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus, Trash2, FileSpreadsheet, Save, ChevronLeft, ChevronRight,
  Check, MoreVertical, AlertTriangle, FileText, Users, Wallet, Landmark, User,
} from 'lucide-react';
import { Cliente } from '@/types/cliente';
import { useClientes } from '@/hooks/useClientes';
import { useFichaCadastral } from '@/hooks/useFichaCadastral';
import { exportFichaXlsx } from '@/lib/fichaCadastral/exportXlsx';
import { emptyConta, emptyDivida, emptyFicha, emptyPessoa, FichaCadastral, Pessoa } from '@/lib/fichaCadastral/schema';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  cliente?: Cliente;
  onSuccess: (clienteId?: string, nomeCliente?: string) => void;
  onCancel: () => void;
}

const CHECKLIST: Array<{ key: keyof FichaCadastral['dados_contrato']['checklist']; label: string }> = [
  { key: 'procuracoes', label: 'Procurações assinadas' },
  { key: 'execucao', label: 'Já há execução?' },
  { key: 'citacao', label: 'Já houve citação?' },
  { key: 'leilao', label: 'Há risco de leilão?' },
  { key: 'avalistas', label: 'Possui avalistas?' },
  { key: 'alienacao', label: 'Alienação fiduciária?' },
];

const STEPS = [
  { id: 'contrato', label: 'Contrato', icon: FileText },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'contas', label: 'Contas', icon: Wallet },
  { id: 'dividas', label: 'Dívidas', icon: Landmark },
] as const;
type StepId = typeof STEPS[number]['id'];

const initials = (n: string) =>
  n.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';

const parseMoney = (s: string) => {
  const cleaned = String(s).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : 0;
};
const fmtMoney = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const FichaCadastralWizard = ({ cliente, onSuccess, onCancel }: Props) => {
  const { createCliente, updateCliente } = useClientes();
  const { fetchByCliente, upsert, loading } = useFichaCadastral();

  const [tab, setTab] = useState<StepId>('contrato');
  const [ficha, setFicha] = useState<FichaCadastral>(() => {
    const f = emptyFicha();
    if (cliente) {
      f.cliente_principal = {
        ...f.cliente_principal,
        nome: cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || '',
        cpf: cliente.cpf || cliente.cnpj || '',
        telefone: cliente.telefone || '',
        email: cliente.email || '',
        endereco: cliente.endereco || '',
        profissao: cliente.profissao || '',
        responsavel_contrato: true,
      };
      if (cliente.data_fechamento) f.dados_contrato.data_fechamento = cliente.data_fechamento;
    }
    return f;
  });

  useEffect(() => {
    if (cliente?.id) {
      fetchByCliente(cliente.id).then((existing) => {
        if (existing) {
          setFicha((prev) => ({
            ...existing,
            cliente_principal: prev.cliente_principal,
          }));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente?.id]);

  const setP = (mut: (f: FichaCadastral) => void) => {
    setFicha((prev) => {
      const next = structuredClone(prev);
      mut(next);
      return next;
    });
  };

  const cp = ficha.cliente_principal;
  const d = ficha.dados_contrato;

  const stepIndex = STEPS.findIndex(s => s.id === tab);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;
  const totalDividas = useMemo(
    () => ficha.dividas.reduce((acc, x) => acc + parseMoney(x.valor_divida), 0),
    [ficha.dividas]
  );

  const handleSave = async (alsoExport = false) => {
    if (!cp.nome.trim()) {
      toast({ title: 'Nome do cliente principal é obrigatório', variant: 'destructive' });
      setTab('clientes');
      return;
    }
    let clienteId = cliente?.id;
    const nome = cp.nome;
    const payload: Partial<Cliente> = {
      nome_pessoa_fisica: cp.nome,
      cpf: cp.cpf || null as any,
      telefone: cp.telefone || null,
      email: cp.email || null,
      endereco: cp.endereco || null,
      profissao: cp.profissao || null,
      data_fechamento: d.data_fechamento || null,
      vendedor: d.consultor || null,
    };
    if (clienteId) {
      const upd = await updateCliente(clienteId, payload);
      if (!upd) return;
    } else {
      const created = await createCliente(payload);
      if (!created) return;
      clienteId = created.id;
    }
    const ok = await upsert(clienteId!, ficha);
    if (!ok) return;
    if (alsoExport) {
      await exportFichaXlsx(ficha, `ficha-${nome.replace(/\s+/g, '_').toLowerCase()}`);
    }
    onSuccess(clienteId, nome);
  };

  const handleExportOnly = async () => {
    await exportFichaXlsx(ficha, `ficha-${(cp.nome || 'cliente').replace(/\s+/g, '_').toLowerCase()}`);
  };

  const goPrev = () => !isFirst && setTab(STEPS[stepIndex - 1].id);
  const goNext = () => {
    if (isLast) return handleSave(false);
    setTab(STEPS[stepIndex + 1].id);
  };

  return (
    <div className="flex flex-col min-h-[60vh] -mx-2 sm:mx-0">
      {/* Header sticky */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-3 sm:px-0 py-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold truncate">
              {cp.nome || 'Nova Ficha Cadastral'}
            </h2>
            <p className="text-xs text-muted-foreground">
              Passo {stepIndex + 1} de {STEPS.length} · {STEPS[stepIndex].label}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="shrink-0">
                <MoreVertical size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportOnly}>
                <FileSpreadsheet size={14} className="mr-2" /> Exportar XLSX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSave(true)} disabled={loading}>
                <FileSpreadsheet size={14} className="mr-2" /> Salvar + Exportar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCancel} className="text-destructive">
                Cancelar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Progress value={progress} className="h-1.5" />
        <div className="flex gap-2 overflow-x-auto -mx-3 px-3 pb-1 snap-x">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === stepIndex;
            const done = i < stepIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setTab(s.id)}
                className={cn(
                  'snap-start shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 h-9 text-sm transition',
                  active && 'bg-primary text-primary-foreground border-primary',
                  !active && done && 'bg-muted text-foreground',
                  !active && !done && 'bg-background text-muted-foreground',
                )}
              >
                {done ? <Check size={14} /> : <Icon size={14} />}
                <span>{i + 1}. {s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 px-3 sm:px-0 py-4 space-y-4 pb-32">
        {tab === 'contrato' && (
          <div className="space-y-4">
            <SectionCard title="Dados do contrato" icon={FileText}>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Forma de captação"
                  value={d.forma_captacao}
                  onChange={(v) => setP(f => { f.dados_contrato.forma_captacao = v; })} />
                <Field label="Consultor"
                  value={d.consultor}
                  onChange={(v) => setP(f => { f.dados_contrato.consultor = v; })} />
                <Field label="Advogado responsável"
                  value={d.advogado_responsavel}
                  onChange={(v) => setP(f => { f.dados_contrato.advogado_responsavel = v; })} />
                <Field label="Responsável financeiro"
                  value={d.responsavel_financeiro}
                  onChange={(v) => setP(f => { f.dados_contrato.responsavel_financeiro = v; })} />
                <Field label="Data de fechamento" type="date"
                  value={d.data_fechamento}
                  onChange={(v) => setP(f => { f.dados_contrato.data_fechamento = v; })} />
                <Field label="Data pagamento entrada" type="date"
                  value={d.data_pagamento_entrada}
                  onChange={(v) => setP(f => { f.dados_contrato.data_pagamento_entrada = v; })} />
              </div>
            </SectionCard>

            <SectionCard title="Serviços contratados">
              <Textarea
                rows={3}
                placeholder="Descreva os serviços contratados..."
                value={d.servicos_contratados}
                onChange={(e) => setP(f => { f.dados_contrato.servicos_contratados = e.target.value; })}
              />
            </SectionCard>

            <SectionCard title="Checklist">
              <div className="space-y-2.5">
                {CHECKLIST.map(({ key, label }) => {
                  const item = d.checklist[key];
                  return (
                    <div key={key} className="rounded-lg border bg-background p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Label className="text-sm font-medium">{label}</Label>
                        <ToggleGroup
                          type="single"
                          size="sm"
                          value={item.resposta}
                          onValueChange={(v) => v && setP(f => { f.dados_contrato.checklist[key].resposta = v as any; })}
                          className="bg-muted rounded-md p-0.5"
                        >
                          <ToggleGroupItem value="sim" className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Sim</ToggleGroupItem>
                          <ToggleGroupItem value="nao" className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Não</ToggleGroupItem>
                          <ToggleGroupItem value="na" className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">N/A</ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                      {item.resposta !== 'na' && (
                        <Input
                          placeholder="Observação (opcional)"
                          value={item.observacao}
                          onChange={(e) => setP(f => { f.dados_contrato.checklist[key].observacao = e.target.value; })}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Observação geral">
              <Textarea rows={3} value={d.observacao_geral}
                onChange={(e) => setP(f => { f.dados_contrato.observacao_geral = e.target.value; })} />
            </SectionCard>

            <SectionCard title="Situações urgentes" icon={AlertTriangle} accent="destructive">
              <Textarea rows={3} value={d.situacoes_urgentes}
                placeholder="Riscos imediatos, leilões marcados, prazos urgentes..."
                onChange={(e) => setP(f => { f.dados_contrato.situacoes_urgentes = e.target.value; })} />
            </SectionCard>
          </div>
        )}

        {tab === 'clientes' && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-3 ring-1 ring-primary/20">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  {initials(cp.nome)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-primary">Cliente principal</span>
                  <p className="text-sm font-semibold truncate">{cp.nome || 'Sem nome'}</p>
                </div>
              </div>
              <PessoaFields
                pessoa={cp}
                onChange={(p) => setP(f => { f.cliente_principal = p; })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Outros clientes</h3>
                <span className="text-xs text-muted-foreground">{ficha.outros_clientes.length}</span>
              </div>

              {ficha.outros_clientes.length === 0 ? (
                <EmptyState icon={User} text="Nenhum cliente adicional." />
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {ficha.outros_clientes.map((p, i) => (
                    <AccordionItem key={i} value={`o-${i}`} className="border rounded-lg bg-card px-3">
                      <div className="flex items-center gap-2">
                        <AccordionTrigger className="flex-1 hover:no-underline py-3">
                          <div className="flex items-center gap-3 min-w-0 text-left">
                            <div className="h-8 w-8 rounded-full bg-muted text-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                              {initials(p.nome)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{p.nome || `Cliente ${i + 2}`}</p>
                              <p className="text-xs text-muted-foreground truncate">{p.cpf || 'Sem CPF'}</p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <Button type="button" size="icon" variant="ghost" className="shrink-0 text-destructive"
                          onClick={() => setP(f => { f.outros_clientes.splice(i, 1); })}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <AccordionContent>
                        <div className="pb-3">
                          <PessoaFields
                            pessoa={p}
                            onChange={(np) => setP(f => { f.outros_clientes[i] = np; })}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}

              <AddButton onClick={() => setP(f => { f.outros_clientes.push(emptyPessoa()); })}>
                Adicionar cliente
              </AddButton>
            </div>
          </div>
        )}

        {tab === 'contas' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Contas contratadas</h3>
              <span className="text-xs text-muted-foreground">{ficha.contas.length} {ficha.contas.length === 1 ? 'conta' : 'contas'}</span>
            </div>

            {ficha.contas.length === 0 ? (
              <EmptyState icon={Wallet} text="Nenhuma conta adicionada." />
            ) : (
              <div className="space-y-2">
                {ficha.contas.map((c, i) => (
                  <div key={i} className="rounded-lg border bg-card p-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Conta {i + 1}</p>
                        <p className="text-sm font-semibold truncate">{c.titular || 'Sem titular'}</p>
                      </div>
                      <Button type="button" size="icon" variant="ghost" className="text-destructive"
                        onClick={() => setP(f => { f.contas.splice(i, 1); })}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-2">
                      <Field label="Titular" value={c.titular}
                        onChange={(v) => setP(f => { f.contas[i].titular = v; })} />
                      <Field label="Banco" value={c.banco}
                        onChange={(v) => setP(f => { f.contas[i].banco = v; })} />
                      <Field label="Agência / Conta" value={c.agencia_conta}
                        onChange={(v) => setP(f => { f.contas[i].agencia_conta = v; })} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <AddButton onClick={() => setP(f => { f.contas.push(emptyConta()); })}>
              Adicionar conta
            </AddButton>
          </div>
        )}

        {tab === 'dividas' && (
          <div className="space-y-3">
            <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total estimado</p>
                <p className="text-xl font-bold">{fmtMoney(totalDividas)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Dívidas</p>
                <p className="text-lg font-semibold">{ficha.dividas.length}</p>
              </div>
            </div>

            {ficha.dividas.length === 0 ? (
              <EmptyState icon={Landmark} text="Nenhuma dívida adicionada." />
            ) : (
              <Accordion type="multiple" className="space-y-2">
                {ficha.dividas.map((dv, i) => (
                  <AccordionItem key={i} value={`d-${i}`} className="border rounded-lg bg-card px-3">
                    <div className="flex items-center gap-2">
                      <AccordionTrigger className="flex-1 hover:no-underline py-3">
                        <div className="flex items-center justify-between gap-2 w-full text-left pr-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{dv.banco || `Dívida ${i + 1}`}</p>
                            <p className="text-xs text-muted-foreground truncate">{dv.situacao_parcelas || 'Sem situação'}</p>
                          </div>
                          <span className="text-sm font-semibold shrink-0">
                            {fmtMoney(parseMoney(dv.valor_divida))}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <Button type="button" size="icon" variant="ghost" className="shrink-0 text-destructive"
                        onClick={() => setP(f => { f.dividas.splice(i, 1); })}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    <AccordionContent>
                      <div className="pb-3 space-y-3">
                        <SubGroup title="Identificação">
                          <Field label="Banco" value={dv.banco}
                            onChange={(v) => setP(f => { f.dividas[i].banco = v; })} />
                          <Field label="Agência / Conta" value={dv.agencia_conta}
                            onChange={(v) => setP(f => { f.dividas[i].agencia_conta = v; })} />
                          <Field label="Titular" value={dv.titular}
                            onChange={(v) => setP(f => { f.dividas[i].titular = v; })} />
                        </SubGroup>
                        <SubGroup title="Valores">
                          <Field label="Anos de movimentação" value={dv.anos_movimentacao}
                            onChange={(v) => setP(f => { f.dividas[i].anos_movimentacao = v; })} />
                          <Field label="Valor da dívida" value={dv.valor_divida} inputMode="decimal"
                            onChange={(v) => setP(f => { f.dividas[i].valor_divida = v; })} />
                          <Field label="Situação parcelas" value={dv.situacao_parcelas}
                            onChange={(v) => setP(f => { f.dividas[i].situacao_parcelas = v; })} />
                        </SubGroup>
                        <SubGroup title="Garantias">
                          <Field label="Bens em garantia" value={dv.bens_garantia}
                            onChange={(v) => setP(f => { f.dividas[i].bens_garantia = v; })} />
                          <Field label="Avalistas" value={dv.avalistas}
                            onChange={(v) => setP(f => { f.dividas[i].avalistas = v; })} />
                        </SubGroup>
                        <div className="space-y-1">
                          <Label className="text-xs">Observação</Label>
                          <Textarea rows={2} value={dv.observacao}
                            onChange={(e) => setP(f => { f.dividas[i].observacao = e.target.value; })} />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            <AddButton onClick={() => setP(f => { f.dividas.push(emptyDivida()); })}>
              Adicionar dívida
            </AddButton>
          </div>
        )}
      </div>

      {/* Footer sticky */}
      <div
        className="sticky bottom-0 z-20 bg-background/95 backdrop-blur border-t px-3 sm:px-0 py-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-11"
            onClick={goPrev}
            disabled={isFirst}
          >
            <ChevronLeft size={16} className="mr-1" /> Voltar
          </Button>
          <Button
            type="button"
            className="flex-[1.5] h-11"
            onClick={goNext}
            disabled={loading}
          >
            {isLast ? (
              <>
                <Save size={16} className="mr-1" /> Salvar ficha
              </>
            ) : (
              <>
                Avançar <ChevronRight size={16} className="ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ============ Helpers ============ */

function SectionCard({
  title, icon: Icon, accent, children,
}: {
  title: string;
  icon?: React.ElementType;
  accent?: 'destructive';
  children: React.ReactNode;
}) {
  return (
    <div className={cn(
      'rounded-xl border bg-card p-4 space-y-3',
      accent === 'destructive' && 'border-destructive/40 bg-destructive/5'
    )}>
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} className={cn('text-muted-foreground', accent === 'destructive' && 'text-destructive')} />}
        <h3 className={cn('text-sm font-semibold', accent === 'destructive' && 'text-destructive')}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SubGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="grid sm:grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', inputMode, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 text-base sm:text-sm"
      />
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="w-full h-11 border-dashed text-muted-foreground hover:text-foreground"
    >
      <Plus size={16} className="mr-1" /> {children}
    </Button>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 py-8 flex flex-col items-center gap-2 text-muted-foreground">
      <Icon size={24} />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function PessoaFields({ pessoa, onChange }: { pessoa: Pessoa; onChange: (p: Pessoa) => void }) {
  const upd = (k: keyof Pessoa, v: any) => onChange({ ...pessoa, [k]: v });
  return (
    <div className="space-y-3">
      <SubGroup title="Identificação">
        <Field label="Nome" value={pessoa.nome} onChange={(v) => upd('nome', v)} />
        <Field label="CPF" value={pessoa.cpf} onChange={(v) => upd('cpf', v)} inputMode="numeric" />
        <Field label="RG" value={pessoa.rg} onChange={(v) => upd('rg', v)} />
      </SubGroup>
      <SubGroup title="Pessoal">
        <Field label="Estado civil" value={pessoa.estado_civil} onChange={(v) => upd('estado_civil', v)} />
        <Field label="Profissão" value={pessoa.profissao} onChange={(v) => upd('profissao', v)} />
      </SubGroup>
      <SubGroup title="Contato">
        <Field label="Telefone" value={pessoa.telefone} onChange={(v) => upd('telefone', v)} inputMode="tel" />
        <Field label="E-mail" type="email" value={pessoa.email} onChange={(v) => upd('email', v)} />
        <div className="sm:col-span-2">
          <Field label="Endereço" value={pessoa.endereco} onChange={(v) => upd('endereco', v)} />
        </div>
      </SubGroup>
      <div className="flex items-center justify-between rounded-lg border bg-background p-3">
        <div>
          <Label className="text-sm">Responsável pelo contrato</Label>
          <p className="text-xs text-muted-foreground">Assina e responde pelo contrato</p>
        </div>
        <Switch
          checked={pessoa.responsavel_contrato}
          onCheckedChange={(c) => upd('responsavel_contrato', !!c)}
        />
      </div>
    </div>
  );
}
