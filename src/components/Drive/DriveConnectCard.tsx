import { Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onConnect: () => void | Promise<void>;
  connecting?: boolean;
}

export const DriveConnectCard = ({ onConnect, connecting }: Props) => {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 gap-4">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Cloud className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Conectar Google Drive</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Use seu próprio Google Drive (15 GB grátis) para arquivos pessoais.
          Tudo fica salvo na sua conta — você acessa também em drive.google.com.
        </p>
      </div>
      <Button onClick={onConnect} disabled={connecting} className="mt-2">
        {connecting ? "Abrindo Google..." : "Conectar Google Drive"}
      </Button>
      <p className="text-[11px] text-muted-foreground max-w-xs">
        O Vouti só vê os arquivos criados ou abertos por este app — não acessa
        seu Drive inteiro.
      </p>
    </div>
  );
};