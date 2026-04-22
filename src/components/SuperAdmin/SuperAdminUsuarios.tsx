import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { SuperAdminOwnPasswordCard } from './SuperAdminOwnPasswordCard';
import { SuperAdminUsersList } from './SuperAdminUsersList';

export function SuperAdminUsuarios({ currentUserEmail }: { currentUserEmail: string | null }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Usuarios</h2>
        <p className="text-muted-foreground">
          Gerencie sua conta de Super Admin e os usuarios de todos os clientes.
        </p>
      </div>

      <SuperAdminOwnPasswordCard email={currentUserEmail} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Todos os usuarios do sistema
          </CardTitle>
          <CardDescription>
            Edite nome, email e senha de qualquer usuario, ou exclua contas. Ignora contas de outros sistemas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SuperAdminUsersList />
        </CardContent>
      </Card>
    </div>
  );
}