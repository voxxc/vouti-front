import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar, CheckCircle2, XCircle } from "lucide-react";

export const GoogleAgendaTab = () => {
  // Estado temporário - será integrado com o banco de dados
  const [isConnected, setIsConnected] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [notifyOneDay, setNotifyOneDay] = useState(true);
  const [notifyOneHour, setNotifyOneHour] = useState(true);

  const handleConnect = () => {
    // TODO: Implementar conexão via standard_connectors--connect
    // connector_id: "google_calendar"
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Explicação */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Sincronize seus prazos automaticamente com o Google Calendar.
          Quando um prazo for atribuído a você, ele será adicionado automaticamente à sua agenda pessoal do Google.
        </p>
      </div>

      {/* Card de Status */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium text-sm">Status da Conexão</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isConnected ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs text-primary">Conectado</span>
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Não conectado</span>
                </>
              )}
            </div>
          </div>
        </div>

        {!isConnected ? (
          <Button onClick={handleConnect} size="sm">
            Conectar com Google
          </Button>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="sync-enabled" className="text-sm font-normal">
                  Sincronizar prazos atribuídos a mim
                </Label>
                <Switch 
                  id="sync-enabled"
                  checked={syncEnabled} 
                  onCheckedChange={setSyncEnabled} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="notify-day" className="text-sm font-normal">
                  Notificação 1 dia antes
                </Label>
                <Switch 
                  id="notify-day"
                  checked={notifyOneDay} 
                  onCheckedChange={setNotifyOneDay}
                  disabled={!syncEnabled}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="notify-hour" className="text-sm font-normal">
                  Notificação 1 hora antes
                </Label>
                <Switch 
                  id="notify-hour"
                  checked={notifyOneHour} 
                  onCheckedChange={setNotifyOneHour}
                  disabled={!syncEnabled}
                />
              </div>
            </div>

            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDisconnect}
              className="text-muted-foreground"
            >
              Desconectar
            </Button>
          </div>
        )}
      </div>

      {/* Nota sobre funcionalidade futura */}
      <p className="text-xs text-muted-foreground">
        A sincronização automática será ativada após a configuração do conector Google Calendar.
      </p>
    </div>
  );
};
