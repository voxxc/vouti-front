import { useState } from "react";
import { useAniversarios } from "@/hooks/useAniversarios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Cake, User, Users, Briefcase, Calendar, Loader2, PartyPopper, Gift } from "lucide-react";
import { format, differenceInDays, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type FilterType = "todos" | "usuarios" | "clientes" | "colaboradores";
type PeriodType = "hoje" | "semana" | "mes";

export const AniversariosTab = () => {
  const { aniversarios, loading } = useAniversarios();
  const [filterType, setFilterType] = useState<FilterType>("todos");
  const [filterPeriod, setFilterPeriod] = useState<PeriodType>("mes");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredAniversarios = aniversarios.filter(item => {
    // Filter by type
    if (filterType !== "todos" && item.tipo !== filterType) return false;

    // Filter by period
    const birthdayThisYear = new Date(today.getFullYear(), item.mes - 1, item.dia);
    if (birthdayThisYear < today) {
      birthdayThisYear.setFullYear(birthdayThisYear.getFullYear() + 1);
    }
    
    const daysUntil = differenceInDays(birthdayThisYear, today);

    if (filterPeriod === "hoje" && daysUntil !== 0) return false;
    if (filterPeriod === "semana" && daysUntil > 7) return false;
    if (filterPeriod === "mes" && daysUntil > 30) return false;

    return true;
  });

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case "usuarios": return <User className="h-4 w-4" />;
      case "clientes": return <Briefcase className="h-4 w-4" />;
      case "colaboradores": return <Users className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (tipo: string) => {
    switch (tipo) {
      case "usuarios": return "Usuário";
      case "clientes": return "Cliente";
      case "colaboradores": return "Colaborador";
      default: return tipo;
    }
  };

  const getTypeColor = (tipo: string) => {
    switch (tipo) {
      case "usuarios": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "clientes": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "colaboradores": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getDaysUntilBirthday = (dia: number, mes: number) => {
    const birthdayThisYear = new Date(today.getFullYear(), mes - 1, dia);
    if (birthdayThisYear < today) {
      birthdayThisYear.setFullYear(birthdayThisYear.getFullYear() + 1);
    }
    return differenceInDays(birthdayThisYear, today);
  };

  const formatBirthdayDate = (dia: number, mes: number) => {
    const date = new Date(today.getFullYear(), mes - 1, dia);
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  const todayCount = aniversarios.filter(item => getDaysUntilBirthday(item.dia, item.mes) === 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta de aniversariantes do dia */}
      {todayCount > 0 && (
        <Card className="border-amber-500/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-full">
                <PartyPopper className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  🎉 {todayCount} aniversariante{todayCount > 1 ? 's' : ''} hoje!
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Não esqueça de dar os parabéns!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Tipo</p>
          <Tabs value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="usuarios">Usuários</TabsTrigger>
              <TabsTrigger value="clientes">Clientes</TabsTrigger>
              <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Período</p>
          <Tabs value={filterPeriod} onValueChange={(v) => setFilterPeriod(v as PeriodType)}>
            <TabsList>
              <TabsTrigger value="hoje">Hoje</TabsTrigger>
              <TabsTrigger value="semana">Esta Semana</TabsTrigger>
              <TabsTrigger value="mes">Este Mês</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Lista de Aniversários */}
      <div className="grid gap-4">
        {filteredAniversarios.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Cake className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Nenhum aniversário encontrado para o período selecionado.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAniversarios.map((item) => {
            const daysUntil = getDaysUntilBirthday(item.dia, item.mes);
            const isToday = daysUntil === 0;
            const initials = item.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

            return (
              <Card 
                key={`${item.tipo}-${item.id}`}
                className={isToday ? "border-amber-500/50 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/10" : ""}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className={isToday ? "bg-amber-500 text-white" : "bg-primary/10"}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        {isToday && (
                          <div className="absolute -top-1 -right-1 p-1 bg-amber-500 rounded-full">
                            <Gift className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{item.nome}</p>
                          {isToday && (
                            <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                              🎂 Hoje!
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatBirthdayDate(item.dia, item.mes)}</span>
                          {!isToday && (
                            <span className="text-xs">
                              (daqui a {daysUntil} dia{daysUntil > 1 ? 's' : ''})
                            </span>
                          )}
                        </div>
                        
                        {item.contato && (
                          <p className="text-xs text-muted-foreground mt-1">{item.contato}</p>
                        )}
                      </div>
                    </div>
                    
                    <Badge className={getTypeColor(item.tipo)}>
                      {getTypeIcon(item.tipo)}
                      <span className="ml-1">{getTypeLabel(item.tipo)}</span>
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Resumo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-foreground">{aniversarios.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {aniversarios.filter(a => a.tipo === "usuarios").length}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">Usuários</p>
            </div>
            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {aniversarios.filter(a => a.tipo === "clientes").length}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">Clientes</p>
            </div>
            <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {aniversarios.filter(a => a.tipo === "colaboradores").length}
              </p>
              <p className="text-sm text-purple-600 dark:text-purple-400">Colaboradores</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
