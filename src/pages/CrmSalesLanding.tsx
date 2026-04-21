import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocalTheme } from "@/hooks/useLocalTheme";
import { AuthThemeToggle } from "@/components/Auth/AuthThemeToggle";
import { createLandingLead } from "@/hooks/useLandingLeads";
import {
  Users,
  FolderKanban,
  MessageCircle,
  Zap,
  Shield,
  Bot,
  Send,
  Repeat,
  Smartphone,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Lock,
  Building2,
  Megaphone,
  Layers,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const CrmSalesLanding = () => {
  useLocalTheme("theme");
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    tamanho_escritorio: "",
    mensagem: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Carrossel vertical (mobile) — seção "Por que Vouti.CRM"
  const diferenciais = [
    { icon: Sparkles, t: "Fluxo de Atendimento & IA", d: "Atendimento 24/7." },
    { icon: Shield, t: "Dados isolados", d: "Row-Level Security em todas as tabelas." },
    { icon: Bot, t: "IA multi-provedor", d: "DeepSeek, Lovable AI ou Grok à sua escolha." },
    { icon: Megaphone, t: "Campanhas em massa", d: "Envio escalonado com variáveis dinâmicas." },
    { icon: Repeat, t: "Transferência fluida", d: "Passe conversas entre atendentes em 1 clique." },
    { icon: Zap, t: "Automação de leads", d: "Mensagem de boas-vindas automática." },
    { icon: Smartphone, t: "Mobile responsivo", d: "Atenda do celular sem perder recursos." },
    { icon: Layers, t: "Tudo integrado", d: "Equipes, projetos e WhatsApp num só DB." },
  ];
  const [activeIdx, setActiveIdx] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const nextDif = () => setActiveIdx((i) => (i + 1) % diferenciais.length);
  const prevDif = () =>
    setActiveIdx((i) => (i - 1 + diferenciais.length) % diferenciais.length);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current == null) return;
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    if (delta < -40) nextDif();
    else if (delta > 40) prevDif();
    touchStartY.current = null;
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast({ title: "Informe seu nome", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await createLandingLead({
        nome: form.nome.trim(),
        email: form.email.trim() || undefined,
        telefone: form.telefone.trim() || undefined,
        tamanho_escritorio: form.tamanho_escritorio || undefined,
        origem: "vouti_crm_landing",
      });
      setSuccess(true);
      toast({
        title: "Recebemos seu contato!",
        description: "Em breve entraremos em contato pelo WhatsApp.",
      });
      setForm({ nome: "", email: "", telefone: "", tamanho_escritorio: "", mensagem: "" });
    } catch (err: any) {
      toast({
        title: "Erro ao enviar",
        description: err?.message || "Tente novamente em instantes",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <span className="text-2xl md:text-3xl font-black tracking-tight lowercase">
            <span className="text-foreground">vouti</span>
            <span className="text-[#E11D48]">.crm</span>
          </span>
          <div className="flex items-center gap-2 md:gap-3">
            <AuthThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => navigate("/crm-app")}
            >
              Já sou cliente
            </Button>
            <Button
              size="sm"
              className="bg-[#E11D48] hover:bg-[#E11D48]/90 text-white"
              onClick={scrollToForm}
            >
              Começar
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-12 pb-16 md:pt-24 md:pb-32 overflow-hidden">
        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-[10%] w-2 h-2 rounded-full bg-[#E11D48] animate-float opacity-70" />
          <div
            className="absolute top-1/3 right-[15%] w-3 h-3 rounded-full bg-primary animate-float opacity-50"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute bottom-1/4 left-1/4 w-2 h-2 rounded-full bg-[#E11D48] animate-float opacity-60"
            style={{ animationDelay: "2s" }}
          />
          <div
            className="absolute bottom-1/3 right-1/3 w-2 h-2 rounded-full bg-primary animate-float opacity-40"
            style={{ animationDelay: "1.5s" }}
          />
        </div>
        {/* Subtle gradient orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#E11D48]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-[1.05] mt-4">
            Sua equipe, seus projetos
            <br />
            e seu <span className="text-[#E11D48]">WhatsApp</span> em um só lugar.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            O Vouti.CRM unifica gestão de equipes, projetos kanban e atendimento WhatsApp
            em uma única plataforma, para que seu time pare de pular entre 5 ferramentas.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-[#E11D48] hover:bg-[#E11D48]/90 text-white shadow-lg shadow-[#E11D48]/30"
              onClick={scrollToForm}
            >
              Começar agora
              <ArrowRight className="ml-1" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/crm-app")}>
              Já sou cliente
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#E11D48]" /> Conforme LGPD
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#E11D48]" /> Multi-tenant isolado
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#E11D48]" /> WhatsApp Cloud API oficial
            </div>
          </div>
        </div>
      </section>

      {/* 3 PILARES */}
      <section className="py-12 md:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Três frentes, <span className="text-[#E11D48]">uma plataforma</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tudo conversa entre si. Sem integrações frágeis, sem dados duplicados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
            {[
              {
                icon: Users,
                t: "Equipes",
                d: "Papéis hierárquicos, permissões por tenant, atribuição de tarefas e chat interno. Cada usuário vê só o que precisa.",
                short: "Papéis, permissões, tarefas e chat interno.",
              },
              {
                icon: FolderKanban,
                t: "Projetos",
                d: "Kanban com prazos automáticos, anexos, comentários com @menções e agenda integrada. Tudo rastreável.",
                short: "Kanban com prazos, anexos e @menções.",
              },
              {
                icon: MessageCircle,
                t: "WhatsApp",
                d: "Inbox unificada, múltiplos atendentes, IA opcional, funil kanban de leads e campanhas em massa.",
                short: "Inbox unificada, IA opcional e campanhas.",
              },
            ].map((p) => (
              <Card
                key={p.t}
                className="p-4 md:p-8 hover:shadow-xl transition-shadow border-border/60 flex md:block items-start gap-4"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#E11D48]/10 flex items-center justify-center md:mb-5 flex-shrink-0">
                  <p.icon className="w-5 h-5 md:w-6 md:h-6 text-[#E11D48]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-xl font-bold mb-1 md:mb-3">{p.t}</h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed md:hidden">
                    {p.short}
                  </p>
                  <p className="hidden md:block text-muted-foreground leading-relaxed">
                    {p.d}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-12 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Em <span className="text-[#E11D48]">4 passos</span> você está vendendo
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-6">
            {[
              { n: "01", t: "Cadastro", d: "Crie sua conta em segundos. Sem cartão." },
              { n: "02", t: "Conexão WhatsApp", d: "WhatsApp Business API oficial. Em 2 cliques." },
              { n: "03", t: "Convide a equipe", d: "Defina papéis e permissões por usuário." },
              { n: "04", t: "Comece a vender", d: "Receba leads, distribua, feche negócios." },
            ].map((step) => (
              <div
                key={step.n}
                className="relative px-4 py-4 md:p-6 rounded-2xl border border-border/60 bg-card flex md:block items-center gap-4"
              >
                <div className="text-3xl md:text-5xl font-black text-[#E11D48]/30 md:text-[#E11D48]/15 md:mb-3 flex-shrink-0 leading-none">
                  {step.n}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base md:text-lg md:mb-2">{step.t}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMONSTRAÇÃO VISUAL — mockup CSS */}
      <section className="py-12 md:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Inbox + Kanban, <span className="text-[#E11D48]">lado a lado</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Atenda no WhatsApp e mova o lead pelo funil sem trocar de tela.
            </p>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card shadow-2xl overflow-hidden">
            <div className="grid lg:grid-cols-[1fr_1.2fr] divide-y lg:divide-y-0 lg:divide-x divide-border/60">
              {/* INBOX MOCK */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
                  <MessageCircle className="w-4 h-4 text-[#E11D48]" />
                  Inbox WhatsApp
                </div>
                <div className="space-y-2">
                  {[
                    { name: "Maria Souza", msg: "Bom dia, gostaria de saber...", time: "09:42", unread: 2 },
                    { name: "João Pereira", msg: "Recebi a proposta, vamos fechar.", time: "09:31", unread: 0 },
                    { name: "Ana Lima", msg: "Quando podemos conversar?", time: "Ontem", unread: 1 },
                    { name: "Carlos Mendes", msg: "Obrigado pelo atendimento!", time: "Ontem", unread: 0 },
                  ].map((c) => (
                    <div
                      key={c.name}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E11D48] to-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm truncate">{c.name}</p>
                          <span className="text-[10px] text-muted-foreground">{c.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{c.msg}</p>
                      </div>
                      {c.unread > 0 && (
                        <span className="w-5 h-5 rounded-full bg-[#E11D48] text-white text-[10px] font-bold flex items-center justify-center">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* KANBAN MOCK */}
              <div className="p-6 bg-muted/20">
                <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
                  <FolderKanban className="w-4 h-4 text-[#E11D48]" />
                  Funil de leads
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { col: "Novo", color: "bg-blue-500", items: ["Maria Souza", "Pedro Alves"] },
                    { col: "Em contato", color: "bg-yellow-500", items: ["João Pereira"] },
                    { col: "Fechado", color: "bg-green-500", items: ["Ana Lima", "Carlos M."] },
                  ].map((col, idx) => (
                    <div
                      key={col.col}
                      className={`space-y-2 ${idx > 0 ? "hidden sm:block" : ""}`}
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className={`w-2 h-2 rounded-full ${col.color}`} />
                        {col.col}
                      </div>
                      {col.items.map((item) => (
                        <div
                          key={item}
                          className="p-3 rounded-lg bg-card border border-border/60 text-xs shadow-sm"
                        >
                          <p className="font-semibold mb-1">{item}</p>
                          <p className="text-muted-foreground text-[10px]">+55 11 9 9999-0000</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="py-12 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Por que <span className="text-[#E11D48]">Vouti.CRM</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {[
              { icon: Sparkles, t: "Fluxo de Atendimento & IA", d: "Atendimento 24/7." },
              { icon: Shield, t: "Dados isolados", d: "Row-Level Security em todas as tabelas." },
              { icon: Bot, t: "IA multi-provedor", d: "DeepSeek, Lovable AI ou Grok à sua escolha." },
              { icon: Megaphone, t: "Campanhas em massa", d: "Envio escalonado com variáveis dinâmicas." },
              { icon: Repeat, t: "Transferência fluida", d: "Passe conversas entre atendentes em 1 clique." },
              { icon: Zap, t: "Automação de leads", d: "Mensagem de boas-vindas automática." },
              { icon: Smartphone, t: "Mobile responsivo", d: "Atenda do celular sem perder recursos." },
              { icon: Layers, t: "Tudo integrado", d: "Equipes, projetos e WhatsApp num só DB." },
            ].map((d) => (
              <div
                key={d.t}
                className="p-4 md:p-6 rounded-2xl border border-border/60 bg-card hover:border-[#E11D48]/40 transition-colors flex md:block items-start gap-3"
              >
                <d.icon className="w-5 h-5 md:w-6 md:h-6 text-[#E11D48] md:mb-3 flex-shrink-0 mt-0.5 md:mt-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm md:text-base mb-0.5 md:mb-1">{d.t}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">{d.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 md:py-28 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Perguntas <span className="text-[#E11D48]">frequentes</span>
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="q1" className="border border-border/60 rounded-xl px-5 bg-card">
              <AccordionTrigger className="text-left font-semibold">
                Quanto custa o Vouti.CRM?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                O preço varia conforme o número de usuários e o volume de mensagens.
                Entre em contato e montamos uma proposta sob medida.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q2" className="border border-border/60 rounded-xl px-5 bg-card">
              <AccordionTrigger className="text-left font-semibold">
                Preciso de um número WhatsApp próprio?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sim. Você conecta seu próprio número via WhatsApp Business API
                oficial da Meta. Damos suporte na configuração.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q3" className="border border-border/60 rounded-xl px-5 bg-card">
              <AccordionTrigger className="text-left font-semibold">
                Funciona com o sistema que já uso?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Oferecemos webhooks e integrações sob demanda. Conte com nossa equipe
                para mapear os fluxos do seu negócio.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q4" className="border border-border/60 rounded-xl px-5 bg-card">
              <AccordionTrigger className="text-left font-semibold">
                Quantos usuários posso adicionar?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Não há limite técnico. O plano é dimensionado conforme o tamanho da
                sua equipe — de 3 a centenas de usuários.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="q5" className="border border-border/60 rounded-xl px-5 bg-card">
              <AccordionTrigger className="text-left font-semibold">
                Meus dados estão seguros?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sim. Cada empresa tem dados completamente isolados via Row-Level
                Security no banco. Conformidade com LGPD e backups diários.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* FORMULÁRIO */}
      <section
        ref={formRef}
        className="py-12 md:py-28 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#E11D48]/5 via-transparent to-primary/5 pointer-events-none" />

        <div className="relative max-w-2xl mx-auto px-4 md:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Vamos <span className="text-[#E11D48]">conversar</span>?
            </h2>
            <p className="text-lg text-muted-foreground">
              Deixe seus dados e nossa equipe entra em contato pelo WhatsApp.
            </p>
          </div>

          <Card className="p-6 md:p-10 shadow-2xl border-border/60">
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Recebemos seu contato!</h3>
                <p className="text-muted-foreground mb-6">
                  Em breve entraremos em contato pelo WhatsApp.
                </p>
                <Button variant="outline" onClick={() => setSuccess(false)}>
                  Enviar outro
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      required
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">WhatsApp</Label>
                    <Input
                      id="telefone"
                      type="tel"
                      value={form.telefone}
                      onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="seu@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tamanho">Tamanho da equipe</Label>
                  <Select
                    value={form.tamanho_escritorio}
                    onValueChange={(v) => setForm({ ...form, tamanho_escritorio: v })}
                  >
                    <SelectTrigger id="tamanho">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-5">1 a 5 pessoas</SelectItem>
                      <SelectItem value="6-15">6 a 15 pessoas</SelectItem>
                      <SelectItem value="16-50">16 a 50 pessoas</SelectItem>
                      <SelectItem value="50+">Mais de 50 pessoas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mensagem">Mensagem (opcional)</Label>
                  <Textarea
                    id="mensagem"
                    rows={3}
                    value={form.mensagem}
                    onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                    placeholder="Conte rapidamente o que sua equipe precisa..."
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="w-full bg-[#E11D48] hover:bg-[#E11D48]/90 text-white shadow-lg shadow-[#E11D48]/30"
                >
                  {submitting ? (
                    "Enviando..."
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Enviar contato
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Ao enviar, você concorda com nossa política de privacidade.
                </p>
              </form>
            )}
          </Card>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-2xl font-black tracking-tight lowercase">
                <span className="text-foreground">vouti</span>
                <span className="text-[#E11D48]">.crm</span>
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                © {new Date().getFullYear()} Vouti. Todos os direitos reservados.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <a href="/" className="hover:text-foreground transition-colors">Vouti.Jurídico</a>
              <a href="/votech" className="hover:text-foreground transition-colors">VoTech</a>
              <a href="/veridicto" className="hover:text-foreground transition-colors">Veridicto</a>
              <a href="/crm-app" className="hover:text-foreground transition-colors">Login</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CrmSalesLanding;