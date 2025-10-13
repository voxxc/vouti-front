import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QrCode, Smartphone, MessageCircle, Bot, BarChart3, Plus, Trash2, Edit, Send, CheckCircle2, Clock, Zap, Wifi, WifiOff, Users, Phone, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppContact {
  id: string;
  name: string;
  number: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface WhatsAppMessage {
  id: string;
  fromNumber: string;
  messageText: string;
  direction: 'sent' | 'received';
  timestamp: string;
}

interface WhatsAppAutomation {
  id: string;
  triggerKeyword: string;
  responseMessage: string;
  isActive: boolean;
}

const WhatsAppBot: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('conexao');
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [selectedContact, setSelectedContact] = useState<WhatsAppContact | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [automations, setAutomations] = useState<WhatsAppAutomation[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [instanceName] = useState('whatsapp-bot');
  const [isResetting, setIsResetting] = useState(false);
  
  // Configurações Z-API
  const [zapiConfig, setZapiConfig] = useState({
    url: '',
    instanceId: '',
    token: ''
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Verificar status da instância Z-API
      const { data: statusData } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'create_instance' }
      });

      if (statusData?.success) {
        toast({
          title: "Verificando instância",
          description: "Conectando com Z-API...",
        });

        // Obter QR Code
        const { data: qrData } = await supabase.functions.invoke('whatsapp-connect', {
          body: { action: 'get_qrcode' }
        });

        if (qrData?.success && qrData.qrcode) {
          // Z-API já retorna o QR code em base64
          const qrCodeData = qrData.qrcode.startsWith('data:') 
            ? qrData.qrcode 
            : `data:image/png;base64,${qrData.qrcode}`;
          
          setQrCode(qrCodeData);
          toast({
            title: "QR Code gerado",
            description: "Escaneie o QR Code com seu WhatsApp",
          });
        }

        // Verificar status periodicamente
        const statusInterval = setInterval(async () => {
          const { data: connectionData } = await supabase.functions.invoke('whatsapp-connect', {
            body: { action: 'get_status' }
          });

          console.log('Status check:', connectionData);

          if (connectionData?.success && connectionData.status === 'open') {
            setIsConnected(true);
            setConnectionStatus('connected');
            setQrCode(null);
            clearInterval(statusInterval);
            
            // Atualizar status no banco
            await supabase
              .from('whatsapp_instances')
              .update({
                connection_status: 'connected',
                last_update: new Date().toISOString()
              })
              .eq('instance_name', zapiConfig.instanceId)
              .eq('user_id', userData.user.id);
            
            console.log('✅ Status da instância atualizado no banco');
            
            setActiveTab('conversas');
            toast({
              title: "WhatsApp conectado!",
              description: "Sua conta foi conectada com sucesso",
            });
          }
        }, 5000); // Verificar a cada 5 segundos

        // Limpar intervalo após 5 minutos
        setTimeout(() => {
          clearInterval(statusInterval);
          if (!isConnected) {
            setConnectionStatus('disconnected');
            setIsConnecting(false);
            toast({
              title: "Timeout",
              description: "Tempo limite para conexão. Tente novamente.",
              variant: "destructive",
            });
          }
        }, 300000);
      }
    } catch (error) {
      console.error('Erro ao conectar:', error);
      toast({
        title: "Erro na conexão",
        description: "Falha ao conectar com Z-API. Verifique suas credenciais.",
        variant: "destructive",
      });
      setConnectionStatus('disconnected');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { data } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'disconnect' }
      });

      if (data?.success) {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setQrCode(null);
        setActiveTab('conexao');
        toast({
          title: "WhatsApp desconectado",
          description: "Conexão encerrada com sucesso",
        });
      }
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      toast({
        title: "Erro",
        description: "Falha ao desconectar",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!selectedContact || !newMessage.trim()) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data } = await supabase.functions.invoke('whatsapp-send-message', {
        body: {
          phone: selectedContact.number,
          message: newMessage,
          messageType: 'text'
        }
      });

      if (data?.success) {
        // Salvar mensagem enviada no banco
        await supabase.from('whatsapp_messages').insert({
          instance_name: instanceName,
          message_id: data.messageId || `msg_${Date.now()}`,
          from_number: selectedContact.number,
          to_number: selectedContact.number,
          message_text: newMessage,
          message_type: 'text',
          direction: 'sent',
          user_id: userData.user.id,
          timestamp: new Date().toISOString()
        });

        // Adicionar mensagem à lista local
        const newMsg: WhatsAppMessage = {
          id: data.messageId || Date.now().toString(),
          fromNumber: selectedContact.number,
          messageText: newMessage,
          direction: 'sent',
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        
        toast({
          title: "Mensagem enviada",
          description: "Mensagem enviada com sucesso",
        });
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar mensagem",
        variant: "destructive",
      });
    }
  };

  const addAutomation = async () => {
    if (!newKeyword.trim() || !newResponse.trim()) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('whatsapp_automations')
        .insert({
          instance_name: instanceName,
          trigger_keyword: newKeyword.toLowerCase(),
          response_message: newResponse,
          is_active: true,
          user_id: userData.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      const newAutomation: WhatsAppAutomation = {
        id: data.id,
        triggerKeyword: data.trigger_keyword,
        responseMessage: data.response_message,
        isActive: data.is_active
      };

      setAutomations(prev => [...prev, newAutomation]);
      setNewKeyword('');
      setNewResponse('');
      
      toast({
        title: "Automação criada",
        description: "Nova automação adicionada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao criar automação:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar automação",
        variant: "destructive",
      });
    }
  };

  const deleteAutomation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_automations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAutomations(prev => prev.filter(auto => auto.id !== id));
      toast({
        title: "Automação removida",
        description: "Automação deletada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao deletar automação:', error);
    }
  };

  const toggleAutomation = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('whatsapp_automations')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      setAutomations(prev => 
        prev.map(auto => 
          auto.id === id ? { ...auto, isActive } : auto
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar automação:', error);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Limpar estado local
      setIsConnected(false);
      setQrCode(null);
      setConnectionStatus('disconnected');
      setContacts([]);
      setMessages([]);
      
      // Limpar do banco
      await supabase.from('whatsapp_instances').delete().eq('user_id', userData.user.id);
      await supabase.from('whatsapp_messages').delete().eq('user_id', userData.user.id);
      
      toast({
        title: "Configurações resetadas",
        description: "Você pode reconfigurar agora com novos dados",
      });
    } catch (error) {
      console.error('Erro ao resetar:', error);
      toast({
        title: "Erro",
        description: "Falha ao resetar configurações",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const saveZapiConfig = async () => {
    setIsSavingConfig(true);
    
    try {
      // Validar campos obrigatórios
      if (!zapiConfig.url || !zapiConfig.instanceId || !zapiConfig.token) {
        toast({
          title: "Campos obrigatórios",
          description: "Preencha todos os campos de configuração",
          variant: "destructive",
        });
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Salvar no banco de dados whatsapp_instances
      const { error: instanceError } = await supabase
        .from('whatsapp_instances')
        .upsert({
          instance_name: zapiConfig.instanceId,
          user_id: userData.user.id,
          connection_status: 'disconnected',
          last_update: new Date().toISOString()
        }, {
          onConflict: 'instance_name'
        });

      if (instanceError) {
        console.error('Erro ao salvar instância:', instanceError);
        throw instanceError;
      }

      // Salvar configurações via edge function
      const { data } = await supabase.functions.invoke('save-zapi-config', {
        body: {
          url: zapiConfig.url,
          instanceId: zapiConfig.instanceId,
          token: zapiConfig.token
        }
      });

      if (data?.success) {
        toast({
          title: "Configuração salva",
          description: "Credenciais salvas com sucesso! Agora você pode conectar.",
        });
        
        console.log('✅ Instância registrada no banco de dados');
        console.log('Instance ID:', zapiConfig.instanceId);
        console.log('User ID:', userData.user.id);
        
        setActiveTab('conexao');
      } else {
        throw new Error(data?.error || 'Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configuração Z-API",
        variant: "destructive",
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  useEffect(() => {
    // Carregar automações existentes
    const loadAutomations = async () => {
      try {
        const { data, error } = await supabase
          .from('whatsapp_automations')
          .select('*')
          .eq('instance_name', instanceName);

        if (error) throw error;

        const loadedAutomations: WhatsAppAutomation[] = data.map(item => ({
          id: item.id,
          triggerKeyword: item.trigger_keyword,
          responseMessage: item.response_message,
          isActive: item.is_active
        }));

        setAutomations(loadedAutomations);
      } catch (error) {
        console.error('Erro ao carregar automações:', error);
      }
    };

    loadAutomations();
  }, []);

  // Verificar status da conexão ao carregar
  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        const { data } = await supabase.functions.invoke('whatsapp-connect', {
          body: { action: 'get_status' }
        });

        console.log('🔍 Verificação inicial de status:', data);

        if (data?.success && data?.data?.connected) {
          setIsConnected(true);
          setConnectionStatus('connected');
          console.log('✅ WhatsApp já está conectado!');
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    };

    checkConnectionStatus();
  }, []);

  // Carregar conversas reais do banco
  useEffect(() => {
    if (!isConnected) return;
    
    const loadConversations = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        // Buscar todas as mensagens do usuário
        const { data: messages, error } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('timestamp', { ascending: false });

        if (error) {
          console.error('Erro ao carregar mensagens:', error);
          return;
        }

        // Agrupar por número de telefone
        const contactsMap = new Map<string, WhatsAppContact>();
        
        messages?.forEach((msg) => {
          const number = msg.from_number;
          if (!contactsMap.has(number)) {
            const chatName = (msg.raw_data as any)?.chatName || number;
            contactsMap.set(number, {
              id: number,
              name: chatName,
              number: number,
              lastMessage: msg.message_text || '',
              lastMessageTime: new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
              }),
              unreadCount: 0
            });
          }
          
          // Contar mensagens não lidas
          if (msg.direction === 'received' && !msg.is_read) {
            const contact = contactsMap.get(number);
            if (contact) {
              contact.unreadCount++;
            }
          }
        });

        setContacts(Array.from(contactsMap.values()));
        console.log('📱 Conversas carregadas:', contactsMap.size);
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
      }
    };

    loadConversations();
    
    // Atualizar a cada 5 segundos
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800';
      case 'pausado': return 'bg-yellow-100 text-yellow-800';
      case 'finalizado': return 'bg-gray-100 text-gray-800';
      case 'inativo': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            WhatsApp Business Bot
          </h2>
          <p className="text-muted-foreground text-sm">Automatize atendimento e capture leads pelo WhatsApp</p>
        </div>
        <div className="flex gap-2">
          {connectionStatus === 'connected' && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
              <Wifi size={14} />
              <span>Conectado</span>
            </div>
          )}
          {connectionStatus === 'connected' ? (
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={async () => {
                try {
                  await supabase.functions.invoke('whatsapp-connect', {
                    body: { action: 'restart' }
                  });
                  toast({
                    title: "Instância reiniciada",
                    description: "A instância Z-API foi reiniciada",
                  });
                } catch (error) {
                  console.error('Erro ao reiniciar:', error);
                }
              }}>
                <QrCode size={16} />
                Reiniciar
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleDisconnect}>
                <WifiOff size={16} />
                Desconectar
              </Button>
            </>
          ) : (
            <Button variant="default" size="sm" className="gap-2" onClick={handleConnect} disabled={isConnecting}>
              <QrCode size={16} />
              {isConnecting ? 'Conectando...' : 'Conectar Z-API'}
            </Button>
          )}
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversas Ativas</p>
                <p className="text-2xl font-bold text-foreground">{contacts.length}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mensagens Hoje</p>
                <p className="text-2xl font-bold text-foreground">{messages.length}</p>
              </div>
              <Send className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Automações Ativas</p>
                <p className="text-2xl font-bold text-foreground">{automations.filter(a => a.isActive).length}</p>
              </div>
              <Bot className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Resposta</p>
                <p className="text-2xl font-bold text-foreground">89%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="configuracao">Configuração</TabsTrigger>
          <TabsTrigger value="conexao">Conexão</TabsTrigger>
          <TabsTrigger value="conversas" disabled={!isConnected}>Conversas</TabsTrigger>
          <TabsTrigger value="fluxos" disabled={!isConnected}>Automações</TabsTrigger>
          <TabsTrigger value="relatorios" disabled={!isConnected}>Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="configuracao" className="space-y-4">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração Z-API
              </CardTitle>
              <CardDescription>
                Configure suas credenciais Z-API para conectar o WhatsApp Business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="zapi-url">URL da Z-API</Label>
                <Input
                  id="zapi-url"
                  placeholder="https://api.z-api.io"
                  value={zapiConfig.url}
                  onChange={(e) => setZapiConfig(prev => ({ ...prev, url: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  URL base da sua instância Z-API
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instance-id">Instance ID</Label>
                <Input
                  id="instance-id"
                  placeholder="Seu Instance ID"
                  value={zapiConfig.instanceId}
                  onChange={(e) => setZapiConfig(prev => ({ ...prev, instanceId: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  ID da sua instância WhatsApp no Z-API
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-token">Client Token</Label>
                <Input
                  id="client-token"
                  type="password"
                  placeholder="Seu Client Token"
                  value={zapiConfig.token}
                  onChange={(e) => setZapiConfig(prev => ({ ...prev, token: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Token de autenticação da sua instância Z-API
                </p>
              </div>

              <Alert>
                <QrCode className="h-4 w-4" />
                <AlertDescription>
                  <strong>Como obter suas credenciais Z-API:</strong>
                  <br />
                  1. Acesse o painel Z-API em <a href="https://developer.z-api.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">developer.z-api.io</a>
                  <br />
                  2. Crie uma nova instância ou acesse uma existente
                  <br />
                  3. Copie a URL, Instance ID e Client Token
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button 
                  onClick={saveZapiConfig} 
                  disabled={isSavingConfig}
                  className="flex-1"
                >
                  {isSavingConfig ? (
                    <>
                      <Clock size={16} className="mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} className="mr-2" />
                      Salvar Configuração
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleReset} 
                  disabled={isResetting}
                  variant="outline"
                  className="flex-1"
                >
                  {isResetting ? (
                    <>
                      <Clock size={16} className="mr-2 animate-spin" />
                      Resetando...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} className="mr-2" />
                      Resetar Tudo
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conexao" className="space-y-4">
          <div className="flex justify-center">
            <Card className="w-full max-w-md border-0 shadow-card">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Conectar WhatsApp
                </CardTitle>
                <CardDescription>
                  Conecte seu WhatsApp Business escaneando o QR Code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {connectionStatus === 'disconnected' && (
                  <div className="text-center space-y-4">
                    <Alert>
                      <QrCode className="h-4 w-4" />
                      <AlertDescription>
                        Clique em "Conectar WhatsApp" para gerar o QR Code e conectar seu dispositivo.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                
                {connectionStatus === 'connecting' && qrCode && (
                  <div className="text-center space-y-4">
                    <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300">
                      <img src={qrCode} alt="QR Code WhatsApp" className="w-48 h-48 mx-auto" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Escaneie o QR Code com seu WhatsApp</p>
                      <p className="text-xs text-muted-foreground">
                        1. Abra o WhatsApp no seu celular<br/>
                        2. Vá em Menu &gt; Aparelhos conectados<br/>
                        3. Toque em "Conectar um aparelho"<br/>
                        4. Escaneie este QR Code
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Clock size={16} className="animate-spin" />
                      Aguardando conexão...
                    </div>
                  </div>
                )}
                
                {connectionStatus === 'connected' && (
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-600">Conectado com sucesso!</p>
                      <p className="text-sm text-muted-foreground">WhatsApp Business Bot</p>
                    </div>
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        Seu WhatsApp está conectado e pronto para uso. Acesse as outras abas para gerenciar conversas e configurar automações.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversas" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de Contatos */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle className="text-base">Contatos Recentes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-2">
                     {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        onClick={async () => {
                          setSelectedContact(contact);
                          // Carregar mensagens do contato
                          const { data: userData } = await supabase.auth.getUser();
                          if (!userData.user) return;
                          
                          const { data } = await supabase
                            .from('whatsapp_messages')
                            .select('*')
                            .eq('user_id', userData.user.id)
                            .eq('from_number', contact.number)
                            .order('timestamp', { ascending: true });

                          setMessages(data?.map(msg => ({
                            id: msg.id,
                            fromNumber: msg.from_number,
                            messageText: msg.message_text,
                            direction: msg.direction as 'sent' | 'received',
                            timestamp: msg.timestamp
                          })) || []);
                          
                          // Marcar mensagens como lidas
                          await supabase
                            .from('whatsapp_messages')
                            .update({ is_read: true })
                            .eq('user_id', userData.user.id)
                            .eq('from_number', contact.number)
                            .eq('direction', 'received')
                            .eq('is_read', false);
                        }}
                        className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedContact?.id === contact.id ? 'bg-muted' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">{contact.name}</h4>
                              {contact.unreadCount > 0 && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  {contact.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{contact.number}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {contact.lastMessage}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {contact.lastMessageTime}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-card h-[500px] flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base">
                    {selectedContact ? selectedContact.name : 'Selecione uma conversa'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  {selectedContact ? (
                    <>
                      {/* Mensagens */}
                      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                        {messages
                          .filter(msg => msg.fromNumber === selectedContact.number)
                          .map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.direction === 'sent' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] p-3 rounded-lg ${
                                message.direction === 'sent'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm">{message.messageText}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs opacity-70">
                                  {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {message.direction === 'sent' && (
                                  <CheckCircle2 className="h-3 w-3 opacity-70" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Input de mensagem */}
                      <div className="p-4 border-t">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Digite sua mensagem..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          />
                          <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Selecione uma conversa para começar</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fluxos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Automações do Bot</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Automação
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Automação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Palavra-chave (trigger)</Label>
                    <Input
                      placeholder="Ex: ola, ajuda, contato"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Resposta automática</Label>
                    <Textarea
                      placeholder="Digite a resposta que será enviada automaticamente"
                      value={newResponse}
                      onChange={(e) => setNewResponse(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button onClick={addAutomation} className="w-full">
                    Criar Automação
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {automations.map((automation) => (
              <Card key={automation.id} className="border-0 shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Trigger: "{automation.triggerKeyword}"
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={automation.isActive}
                        onCheckedChange={(checked) => toggleAutomation(automation.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAutomation(automation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge className={automation.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {automation.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {automation.responseMessage}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Métricas de Hoje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Mensagens enviadas</span>
                  <span className="font-medium">{messages.filter(m => m.direction === 'sent').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Mensagens recebidas</span>
                  <span className="font-medium">{messages.filter(m => m.direction === 'received').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Conversas ativas</span>
                  <span className="font-medium">{contacts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Taxa de resposta</span>
                  <span className="font-medium">89%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Performance das Automações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {automations.map((automation) => (
                  <div key={automation.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">"{automation.triggerKeyword}"</span>
                      <Badge className={automation.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {automation.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Acionamentos: 0 | Conversões: 0
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppBot;