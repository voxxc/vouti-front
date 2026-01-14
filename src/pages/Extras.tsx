import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Cake } from "lucide-react";
import { PerfilTab } from "@/components/Extras/PerfilTab";
import { AniversariosTab } from "@/components/Extras/AniversariosTab";

const Extras = () => {
  return (
    <DashboardLayout currentPage="extras">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Extras</h1>
          <p className="text-muted-foreground">Funcionalidades adicionais do sistema</p>
        </div>

        <Tabs defaultValue="perfil" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="perfil" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="aniversarios" className="flex items-center gap-2">
              <Cake className="h-4 w-4" />
              Aniversários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perfil" className="mt-6">
            <PerfilTab />
          </TabsContent>

          <TabsContent value="aniversarios" className="mt-6">
            <AniversariosTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Extras;
