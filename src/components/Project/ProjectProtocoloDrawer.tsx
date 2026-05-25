import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ProjectProtocolo, CreateEtapaData } from '@/hooks/useProjectProtocolos';
import { ProjectProtocoloContent } from './ProjectProtocoloContent';

interface ProjectProtocoloDrawerProps {
  protocolo: ProjectProtocolo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddEtapa: (protocoloId: string, data: CreateEtapaData) => Promise<void>;
  onUpdateEtapa: (id: string, data: any) => Promise<void>;
  onDeleteEtapa: (id: string) => Promise<void>;
  projectId?: string;
  onRefetch?: () => Promise<void>;
}

export function ProjectProtocoloDrawer({
  protocolo,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  onAddEtapa,
  onUpdateEtapa,
  onDeleteEtapa,
  projectId,
  onRefetch
}: ProjectProtocoloDrawerProps) {
  if (!protocolo) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="border-b pb-3 md:pb-4 px-3 md:px-6">
          <div className="flex items-start justify-between gap-2">
            <DrawerTitle className="text-base md:text-xl leading-snug break-words flex-1 min-w-0">{protocolo.nome}</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="shrink-0 -mt-1">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="px-3 py-3 md:p-4 flex flex-col overflow-hidden" style={{ height: '75vh' }}>
          <ProjectProtocoloContent
            protocolo={protocolo}
            onUpdate={onUpdate}
            onDelete={async (id) => {
              await onDelete(id);
              onOpenChange(false);
            }}
            onAddEtapa={onAddEtapa}
            onUpdateEtapa={onUpdateEtapa}
            onDeleteEtapa={onDeleteEtapa}
            projectId={projectId}
            onRefetch={onRefetch}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
