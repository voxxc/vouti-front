import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, FileText } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";

interface AcordosProps {
  onLogout: () => void;
  onBack: () => void;
}

const Acordos = ({ onLogout, onBack }: AcordosProps) => {
  return (
    <DashboardLayout onLogout={onLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="gap-2">
              <ArrowLeft size={16} />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Acordos</h1>
              <p className="text-muted-foreground">Gerencie acordos e termos</p>
            </div>
          </div>
          <Button variant="professional" className="gap-2" disabled>
            <Plus size={16} />
            Novo Acordo
          </Button>
        </div>

        {/* Empty State */}
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Seção em Desenvolvimento
          </h3>
          <p className="text-muted-foreground mb-4">
            Esta funcionalidade será implementada em breve
          </p>
          <Card className="max-w-md mx-auto shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-sm">Funcionalidades Planejadas:</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1 text-left">
                <li>• Criação de acordos</li>
                <li>• Templates de documentos</li>
                <li>• Assinaturas digitais</li>
                <li>• Histórico de versões</li>
                <li>• Status de aprovação</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Acordos;