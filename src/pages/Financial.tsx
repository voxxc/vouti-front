import { useState } from 'react';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FileText, 
  Calendar,
  Upload,
  Download,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface FinancialProps {
  onLogout: () => void;
  onBack: () => void;
}

interface ClientFinancial {
  id: string;
  name: string;
  status: 'active' | 'defaulter';
  monthlyValue: number;
  lastPayment: Date;
  contracts: number;
  history: FinancialHistoryEntry[];
}

interface FinancialHistoryEntry {
  id: string;
  action: 'payment_received' | 'contract_added' | 'status_changed' | 'value_updated';
  details: string;
  user: string;
  timestamp: Date;
  amount?: number;
}

const Financial = ({ onLogout, onBack }: FinancialProps) => {
  const [clients] = useState<ClientFinancial[]>([
    {
      id: '1',
      name: 'João Silva',
      status: 'active',
      monthlyValue: 1500,
      lastPayment: new Date(2024, 0, 15),
      contracts: 3,
      history: []
    },
    {
      id: '2',
      name: 'Maria Santos',
      status: 'defaulter',
      monthlyValue: 2500,
      lastPayment: new Date(2023, 11, 10),
      contracts: 2,
      history: []
    }
  ]);

  const activeClients = clients.filter(c => c.status === 'active').length;
  const defaulterClients = clients.filter(c => c.status === 'defaulter').length;
  const totalRevenue = clients.reduce((sum, client) => sum + (client.status === 'active' ? client.monthlyValue : 0), 0);
  const pendingRevenue = clients.reduce((sum, client) => sum + (client.status === 'defaulter' ? client.monthlyValue : 0), 0);

  return (
    <DashboardLayout currentPage="financial">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">Gestão financeira e controle de clientes</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Upload size={16} />
                  Importar Dados
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Importar Dados Financeiros</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="file">Arquivo CSV/Excel</Label>
                    <Input type="file" accept=".csv,.xlsx,.xls" />
                  </div>
                  <Button className="w-full">Importar</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="gap-2">
              <Download size={16} />
              Relatório
            </Button>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length}</div>
              <p className="text-xs text-muted-foreground">
                +2 este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeClients}</div>
              <p className="text-xs text-muted-foreground">
                Adimplentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inadimplentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{defaulterClients}</div>
              <p className="text-xs text-muted-foreground">
                Requer atenção
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {totalRevenue.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-red-600">
                R$ {pendingRevenue.toLocaleString('pt-BR')} em atraso
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="clients" className="space-y-4">
          <TabsList>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
            <TabsTrigger value="contracts">Contratos</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => (
                <Card key={client.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <Badge 
                        variant={client.status === 'active' ? 'default' : 'destructive'}
                      >
                        {client.status === 'active' ? 'Ativo' : 'Inadimplente'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Valor Mensal:</span>
                      <span className="font-medium">
                        R$ {client.monthlyValue.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Último Pagamento:</span>
                      <span className="text-sm">
                        {client.lastPayment.toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Contratos:</span>
                      <span className="text-sm">{client.contracts}</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="ghost" size="sm" className="flex-1">
                        <Edit size={14} className="mr-1" />
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contratos e Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Funcionalidade de armazenamento de contratos em desenvolvimento</p>
                  <p className="text-sm">Upload e gestão de documentos contratuais</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Alterações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Histórico de ações financeiras será exibido aqui</p>
                  <p className="text-sm">Pagamentos, alterações de status, atualizações de valores</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Financial;