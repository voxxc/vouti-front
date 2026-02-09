import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Bot, Sparkles, MessageSquare, Thermometer, History, Save, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";

interface AIConfig {
  id?: string;
  is_enabled: boolean;
  agent_name: string;
  system_prompt: string;
  model_name: string;
  temperature: number;
  max_history: number;
}

const DEFAULT_PROMPT = `Você é um assistente virtual prestativo. Responda de forma amigável e profissional.

REGRAS:
- Seja educado e profissional
- Responda em português
- Limite suas respostas a 300 caracteres
- Se não souber algo, peça para aguardar um atendente humano
- Nunca invente informações`;

const AVAILABLE_MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Rápido)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Balanceado)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Avançado)" },
];

interface WhatsAppAISettingsProps {
  isSuperAdmin?: boolean;
  agentId?: string;
}

export const WhatsAppAISettings = ({ isSuperAdmin = false, agentId }: WhatsAppAISettingsProps) => {
  const { toast } = useToast();
  const { tenantId } = useTenantId();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLandingAgent, setIsLandingAgent] = useState(false);
  const [landingPageSource, setLandingPageSource] = useState<string | null>(null);
  const [config, setConfig] = useState<AIConfig>({
    is_enabled: false,
    agent_name: "Assistente",
    system_prompt: DEFAULT_PROMPT,
    model_name: "google/gemini-3-flash-preview",
    temperature: 0.7,
    max_history: 10,
  });

  useEffect(() => {
    loadConfig();
  }, [tenantId, isSuperAdmin, agentId]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('whatsapp_ai_config')
        .select('*');

      if (isSuperAdmin) {
        query = query.is('tenant_id', null);
      } else if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      } else {
        setIsLoading(false);
        return;
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Erro ao carregar config:', error);
        return;
      }

      if (data) {
        setConfig({
          id: data.id,
          is_enabled: data.is_enabled || false,
          agent_name: data.agent_name || "Assistente",
          system_prompt: data.system_prompt || DEFAULT_PROMPT,
          model_name: data.model_name || "google/gemini-3-flash-preview",
          temperature: data.temperature || 0.7,
          max_history: data.max_history || 10,
        });
      }

      // Carregar status de is_landing_agent do agente (Super Admin)
      if (isSuperAdmin && agentId) {
        const { data: agentData } = await supabase
          .from('whatsapp_agents')
          .select('is_landing_agent')
          .eq('id', agentId)
          .single();
        
        if (agentData) {
          setIsLandingAgent(agentData.is_landing_agent || false);
        }
      }

      // Carregar landing_page_source do agente (Tenants)
      if (!isSuperAdmin && agentId) {
        const { data: agentData } = await supabase
          .from('whatsapp_agents')
          .select('landing_page_source')
          .eq('id', agentId)
          .single();
        
        if (agentData) {
          setLandingPageSource(agentData.landing_page_source || null);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLandingAgentChange = async (checked: boolean) => {
    if (!agentId) return;

    try {
      if (checked) {
        // Desmarcar qualquer outro agente que esteja marcado como landing
        await supabase
          .from('whatsapp_agents')
          .update({ is_landing_agent: false })
          .is('tenant_id', null)
          .eq('is_landing_agent', true);
      }

      // Atualizar este agente
      const { error } = await supabase
        .from('whatsapp_agents')
        .update({ is_landing_agent: checked })
        .eq('id', agentId);

      if (error) throw error;

      setIsLandingAgent(checked);
      toast({
        title: checked ? "Agente da Homepage ativado" : "Agente da Homepage desativado",
        description: checked 
          ? "Este agente agora responderá os leads da homepage"
          : "Este agente não responderá mais os leads da homepage",
      });
    } catch (error) {
      console.error('Erro ao atualizar landing agent:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a configuração",
        variant: "destructive",
      });
    }
  };

  const handleLandingPageSourceChange = async (value: string) => {
    if (!agentId || !tenantId) return;

    const actualValue = value === 'none' ? null : value;

    try {
      // Se for selecionar uma página, desmarcar outros agentes
      if (actualValue) {
        await supabase
          .from('whatsapp_agents')
          .update({ landing_page_source: null })
          .eq('tenant_id', tenantId)
          .eq('landing_page_source', actualValue);
      }

      // Atualizar este agente
      const { error } = await supabase
        .from('whatsapp_agents')
        .update({ landing_page_source: actualValue })
        .eq('id', agentId);

      if (error) throw error;

      setLandingPageSource(actualValue);
      toast({
        title: actualValue ? "Landing page vinculada" : "Vínculo removido",
        description: actualValue 
          ? `Este agente responderá leads da ${actualValue === 'landing_page_1' ? 'Landing Page 1' : 'Landing Page 2'}`
          : "Este agente não responderá mais leads de landing pages",
      });
    } catch (error) {
      console.error('Erro ao atualizar landing page source:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a configuração",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        tenant_id: isSuperAdmin ? null : tenantId,
        is_enabled: config.is_enabled,
        agent_name: config.agent_name,
        system_prompt: config.system_prompt,
        model_name: config.model_name,
        temperature: config.temperature,
        max_history: config.max_history,
        updated_at: new Date().toISOString(),
      };

      let error;

      if (config.id) {
        // Update existing
        const result = await supabase
          .from('whatsapp_ai_config')
          .update(payload)
          .eq('id', config.id);
        error = result.error;
      } else {
        // Insert new
        const result = await supabase
          .from('whatsapp_ai_config')
          .insert(payload)
          .select()
          .single();
        
        error = result.error;
        if (result.data) {
          setConfig(prev => ({ ...prev, id: result.data.id }));
        }
      }

      if (error) {
        throw error;
      }

      toast({
        title: "Configuração salva",
        description: config.is_enabled 
          ? "Agente IA ativado e pronto para responder!"
          : "Configuração salva com sucesso",
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bot className="h-6 w-6" />
          Agente IA
        </h2>
      <p className="text-muted-foreground">
        Configure o comportamento da IA que responde automaticamente aos leads
      </p>
    </div>

    {/* Checkbox Agente da Homepage (apenas Super Admin) */}
    {isSuperAdmin && agentId && (
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Checkbox
              id="landing-agent"
              checked={isLandingAgent}
              onCheckedChange={(checked) => handleLandingAgentChange(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="landing-agent"
                className="text-base font-semibold cursor-pointer flex items-center gap-2"
              >
                <Globe className="h-4 w-4 text-primary" />
                Agente da Homepage
              </label>
              <p className="text-sm text-muted-foreground">
                Quando marcado, este agente será responsável por atender automaticamente 
                os leads que chegam da homepage vouti.co/
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                ⚠️ Apenas um agente pode ter esta opção ativada por vez
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )}

    {/* Select Landing Page (apenas Tenants) */}
    {!isSuperAdmin && agentId && (
      <div className="space-y-2">
        <Label className="text-sm font-medium">Landing Page</Label>
        <Select
          value={landingPageSource || 'none'}
          onValueChange={handleLandingPageSourceChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione a página" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            <SelectItem value="landing_page_1">Landing Page 1 (/landing-1)</SelectItem>
            <SelectItem value="landing_page_2">Landing Page 2 (/office)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Ao selecionar, leads dessa página serão atendidos por este agente
        </p>
      </div>
    )}

    {/* Toggle Principal */}
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.is_enabled ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'}`}>
              <Sparkles className={`h-5 w-5 ${config.is_enabled ? 'text-green-600' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <Label className="text-base font-semibold">Habilitar Agente IA</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, a IA responde automaticamente às mensagens
              </p>
            </div>
          </div>
          <Switch
            checked={config.is_enabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, is_enabled: checked }))}
          />
        </div>
      </CardContent>
    </Card>

      {/* Nome do Agente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Nome do Agente
          </CardTitle>
          <CardDescription>
            Como a IA vai se identificar nas conversas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Ex: Maria, João, Assistente Virtual..."
            value={config.agent_name}
            onChange={(e) => setConfig(prev => ({ ...prev, agent_name: e.target.value }))}
          />
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personalidade e Comportamento</CardTitle>
          <CardDescription>
            Defina como a IA deve se comportar, suas regras e informações sobre seu negócio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Descreva a personalidade, regras e informações que a IA deve usar..."
            value={config.system_prompt}
            onChange={(e) => setConfig(prev => ({ ...prev, system_prompt: e.target.value }))}
            className="min-h-[200px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Dica: Inclua informações sobre seu escritório, serviços oferecidos e regras de atendimento
          </p>
        </CardContent>
      </Card>

      {/* Configurações Avançadas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurações Avançadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Modelo */}
          <div className="space-y-2">
            <Label>Modelo de IA</Label>
            <Select
              value={config.model_name}
              onValueChange={(value) => setConfig(prev => ({ ...prev, model_name: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Temperatura */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Temperatura: {config.temperature.toFixed(1)}
              </Label>
            </div>
            <Slider
              value={[config.temperature]}
              onValueChange={([value]) => setConfig(prev => ({ ...prev, temperature: value }))}
              min={0}
              max={1}
              step={0.1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Mais preciso</span>
              <span>Mais criativo</span>
            </div>
          </div>

          {/* Histórico */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Mensagens de Histórico
            </Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={config.max_history}
              onChange={(e) => setConfig(prev => ({ ...prev, max_history: parseInt(e.target.value) || 10 }))}
            />
            <p className="text-xs text-muted-foreground">
              Quantas mensagens anteriores usar como contexto (1-50)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <Button onClick={handleSave} disabled={isSaving} className="w-full" size="lg">
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
};
