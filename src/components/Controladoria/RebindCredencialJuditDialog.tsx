import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RebindCredencialJuditPanel } from './RebindCredencialJuditPanel';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantIdOverride?: string;
}

export const RebindCredencialJuditDialog = ({ open, onOpenChange, tenantIdOverride }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recriar tracking com credencial</DialogTitle>
        </DialogHeader>
        <RebindCredencialJuditPanel tenantId={tenantIdOverride} />
      </DialogContent>
    </Dialog>
  );
};

export default RebindCredencialJuditDialog;