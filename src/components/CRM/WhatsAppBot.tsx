import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Phone, Settings, Users, BarChart3, Send, Bot, CheckCircle2, Clock, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface WhatsAppContact {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  lastMessageTime: Date;
  status: 'ativo' | 'pausado' | 'finalizado';
  tags: string[];
}

interface BotFlow {
  id: string;
  name: string;
  trigger: string;
  status: 'ativo' | 'inativo';
  responses: number;
  conversions: number;
}

interface WhatsAppMessage {
  id: string;
  text: string;
  type: 'sent' | 'received';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
}

const WhatsAppBot = () => {
  const [activeTab, setActiveTab] = useState("conversas");
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);

  // Mock data
  const contacts: WhatsAppContact[] = [
    {
      id: '1',
      name: 'Maria Silva',
      phone: '(11) 99999-9999',
      lastMessage: 'Gostaria de saber mais sobre consultoria trabalhista',
      lastMessageTime: new Date('2024-01-28T14:30:00'),
      status: 'ativo',
      tags: ['lead', 'trabalhista']
    },
    {
      id: '2',
      name: 'João Santos',
      phone: '(11) 88888-8888',
      lastMessage: 'Bot: Obrigado pelo interesse! Um especialista entrará em contato.',
      lastMessageTime: new Date('2024-01-28T13:15:00'),
      status: 'pausado',
      tags: ['cliente', 'empresarial']
    }
  ];

  const botFlows: BotFlow[] = [
    {
      id: '1',
      name: 'Boas-vindas Inicial',
      trigger: 'primeira mensagem',
      status: 'ativo',
      responses: 45,
      conversions: 12
    },
    {
      id: '2',
      name: 'Qualificação de Lead',
      trigger: 'palavra-chave: consultoria',
      status: 'ativo',
      responses: 23,
      conversions: 8
    }
  ];

  const messages: WhatsAppMessage[] = [
    {
      id: '1',
      text: 'Olá! Vi que vocês prestam consultoria jurídica. Gostaria de saber mais.',
      type: 'received',
      timestamp: new Date('2024-01-28T14:25:00'),
      status: 'read'
    },
    {
      id: '2',
      text: 'Olá! Obrigado pelo interesse. Somos especializados em direito trabalhista e empresarial. Em que posso ajudá-lo?',
      type: 'sent',
      timestamp: new Date('2024-01-28T14:26:00'),
      status: 'read'
    },
    {
      id: '3',
      text: 'Gostaria de saber mais sobre consultoria trabalhista',
      type: 'received',
      timestamp: new Date('2024-01-28T14:30:00'),
      status: 'read'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800';
      case 'pausado': return 'bg-yellow-100 text-yellow-800';
      case 'finalizado': return 'bg-gray-100 text-gray-800';
      case 'inativo': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    // Aqui implementar o envio da mensagem
    console.log('Enviando mensagem:', newMessage);
    setNewMessage("");
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
          <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings size={16} />
                Configurações
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Configurações do Bot</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Número do WhatsApp Business</Label>
                  <Input id="phone" placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token">Token da API WhatsApp</Label>
                  <Input id="token" type="password" placeholder="Seu token da API" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="bot-active">Bot Ativo</Label>
                  <Switch id="bot-active" />
                </div>
                <Button className="w-full">Salvar Configurações</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="professional" size="sm" className="gap-2">
            <Bot size={16} />
            Ativar Bot
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversas Ativas</p>
                <p className="text-2xl font-bold text-foreground">23</p>
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
                <p className="text-2xl font-bold text-foreground">157</p>
              </div>
              <Send className="h-8 w-8 text-blue-600" />
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
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Leads Gerados</p>
                <p className="text-2xl font-bold text-foreground">34</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="conversas">Conversas</TabsTrigger>
          <TabsTrigger value="fluxos">Fluxos do Bot</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

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
                        onClick={() => setSelectedContact(contact.id)}
                        className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedContact === contact.id ? 'bg-muted' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">{contact.name}</h4>
                              <Badge className={getStatusColor(contact.status)} variant="secondary">
                                {contact.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{contact.phone}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {contact.lastMessage}
                            </p>
                            <div className="flex gap-1 mt-2">
                              {contact.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {contact.lastMessageTime.toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
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
                    {selectedContact ? 
                      contacts.find(c => c.id === selectedContact)?.name : 
                      'Selecione uma conversa'
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  {selectedContact ? (
                    <>
                      {/* Mensagens */}
                      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] p-3 rounded-lg ${
                                message.type === 'sent'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm">{message.text}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs opacity-70">
                                  {message.timestamp.toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {message.type === 'sent' && (
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
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="flex-1"
                          />
                          <Button onClick={handleSendMessage} size="sm" className="gap-2">
                            <Send size={16} />
                            Enviar
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Selecione uma conversa para começar</p>
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
            <h3 className="text-lg font-medium">Fluxos Automatizados</h3>
            <Button variant="professional" size="sm" className="gap-2">
              <Bot size={16} />
              Novo Fluxo
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {botFlows.map((flow) => (
              <Card key={flow.id} className="border-0 shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{flow.name}</CardTitle>
                      <CardDescription>Trigger: {flow.trigger}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(flow.status)}>
                      {flow.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{flow.responses}</p>
                      <p className="text-xs text-muted-foreground">Respostas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{flow.conversions}</p>
                      <p className="text-xs text-muted-foreground">Conversões</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      {flow.status === 'ativo' ? 'Pausar' : 'Ativar'}
                    </Button>
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
                <CardTitle className="text-base">Performance Semanal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Mensagens Enviadas</span>
                    <span className="font-bold">1,234</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Taxa de Entrega</span>
                    <span className="font-bold text-green-600">98.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Taxa de Leitura</span>
                    <span className="font-bold text-blue-600">87.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Leads Convertidos</span>
                    <span className="font-bold text-purple-600">45</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Horários de Maior Atividade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">09:00 - 12:00</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full">
                        <div className="w-12 h-2 bg-green-600 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium">75%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">14:00 - 17:00</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full">
                        <div className="w-14 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium">87%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">19:00 - 21:00</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full">
                        <div className="w-10 h-2 bg-purple-600 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium">62%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppBot;