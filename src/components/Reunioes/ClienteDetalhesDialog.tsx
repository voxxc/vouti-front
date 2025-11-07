import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReuniaoCliente } from '@/types/reuniao';
import { ClienteInfoTab } from './ClienteInfoTab';
import { ClienteComentariosTab } from './ClienteComentariosTab';
import { ClienteArquivosTab } from './ClienteArquivosTab';
import { ClienteHistoricoTab } from './ClienteHistoricoTab';
import { Info, MessageSquare, FileText, History } from 'lucide-react';

interface ClienteDetalhesDialogProps {
  cliente: ReuniaoCliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  onDelete?: () => void;
}

export const ClienteDetalhesDialog = ({
  cliente,
  open,
  onOpenChange,
  onUpdate,
  onDelete
}: ClienteDetalhesDialogProps) => {
  const [activeTab, setActiveTab] = useState('info');

  const handleDelete = () => {
    onOpenChange(false);
    if (onDelete) onDelete();
  };

  if (!cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{cliente.nome}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>Informações</span>
            </TabsTrigger>
            <TabsTrigger value="comentarios" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>Comentários</span>
            </TabsTrigger>
            <TabsTrigger value="arquivos" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Arquivos</span>
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span>Histórico</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <ClienteInfoTab cliente={cliente} onUpdate={onUpdate} onDelete={handleDelete} />
          </TabsContent>

          <TabsContent value="comentarios" className="mt-4">
            <ClienteComentariosTab clienteId={cliente.id} />
          </TabsContent>

          <TabsContent value="arquivos" className="mt-4">
            <ClienteArquivosTab clienteId={cliente.id} />
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <ClienteHistoricoTab clienteId={cliente.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
