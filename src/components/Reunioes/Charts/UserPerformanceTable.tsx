import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserMetrics } from '@/hooks/useReuniaoMetrics';
import { Trophy } from 'lucide-react';

interface UserPerformanceTableProps {
  userMetrics: UserMetrics[];
}

export const UserPerformanceTable = ({ userMetrics }: UserPerformanceTableProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por Usuário</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead className="text-right">Total Reuniões</TableHead>
              <TableHead className="text-right">Clientes</TableHead>
              <TableHead className="text-right">Fechados</TableHead>
              <TableHead className="text-right">Taxa Conv.</TableHead>
              <TableHead className="text-right">Média/Cliente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userMetrics.map((user, index) => {
              const fechados = user.reunioesPorStatus.find(r => r.status === 'fechado')?.count || 0;
              return (
                <TableRow key={user.userId}>
                  <TableCell>
                    {index === 0 && (
                      <Trophy className="h-4 w-4 text-yellow-500" />
                    )}
                    {index > 0 && <span className="text-muted-foreground">{index + 1}</span>}
                  </TableCell>
                  <TableCell className="font-medium">{user.userName}</TableCell>
                  <TableCell className="text-right">{user.totalReunioes}</TableCell>
                  <TableCell className="text-right">{user.totalClientes}</TableCell>
                  <TableCell className="text-right">{fechados}</TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant={user.taxaConversao >= 30 ? 'default' : 'secondary'}
                      className="tabular-nums"
                    >
                      {user.taxaConversao.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {user.mediaReunioesPorCliente.toFixed(1)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
