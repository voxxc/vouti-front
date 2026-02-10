import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star } from "lucide-react";
import { PerfilTab } from "./PerfilTab";
import { AniversariosTab } from "./AniversariosTab";
import { GoogleAgendaTab } from "./GoogleAgendaTab";
import { TimezoneTab } from "./TimezoneTab";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type TabType = 'perfil' | 'aniversarios' | 'google-agenda' | 'timezone';

interface ExtrasDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TabButton = ({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "pb-2 text-sm font-medium transition-colors relative",
      active
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground"
    )}
  >
    {children}
    {active && (
      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
    )}
  </button>
);

export function ExtrasDrawer({ open, onOpenChange }: ExtrasDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('perfil');
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent 
        side="inset"
        className="p-0 flex flex-col"
      >
        <SheetTitle className="sr-only">Extras</SheetTitle>
        
        {/* Header */}
        <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
          <Star className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Extras</span>
        </div>

        {/* Conteúdo scrollável */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            {/* Tabs */}
            <div className="flex gap-6 border-b">
              <TabButton 
                active={activeTab === 'perfil'} 
                onClick={() => setActiveTab('perfil')}
              >
                Perfil
              </TabButton>
              {isAdmin && (
                <TabButton 
                  active={activeTab === 'aniversarios'} 
                  onClick={() => setActiveTab('aniversarios')}
                >
                  Aniversários
                </TabButton>
              )}
              <TabButton 
                active={activeTab === 'google-agenda'} 
                onClick={() => setActiveTab('google-agenda')}
              >
                Google Agenda
              </TabButton>
              {isAdmin && (
                <TabButton 
                  active={activeTab === 'timezone'} 
                  onClick={() => setActiveTab('timezone')}
                >
                  Timezone
                </TabButton>
              )}
            </div>

            {/* Conteúdo da tab */}
            <div className="pt-2">
              {activeTab === 'perfil' && <PerfilTab />}
              {activeTab === 'aniversarios' && isAdmin && <AniversariosTab />}
              {activeTab === 'google-agenda' && <GoogleAgendaTab />}
              {activeTab === 'timezone' && isAdmin && <TimezoneTab />}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
