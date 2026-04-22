import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tenant } from '@/types/superadmin';
import { SuperAdminUsersList } from './SuperAdminUsersList';

interface TenantUsersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
}

export function TenantUsersDrawer({ open, onOpenChange, tenant }: TenantUsersDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Usuarios de {tenant?.name}</SheetTitle>
          <SheetDescription>
            Edite nome, email e senha dos usuarios deste cliente, ou exclua contas.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          {tenant && (
            <SuperAdminUsersList fixedTenantId={tenant.id} hideSuperAdmins />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}