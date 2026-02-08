import { useState } from "react";
import { SuperAdminWhatsAppSidebar } from "./SuperAdminWhatsAppSidebar";
import { SuperAdminWhatsAppInbox } from "./SuperAdminWhatsAppInbox";

export type SuperAdminWhatsAppSection = 
  | "inbox" 
  | "conversations" 
  | "contacts" 
  | "settings";

export const SuperAdminWhatsAppLayout = () => {
  const [activeSection, setActiveSection] = useState<SuperAdminWhatsAppSection>("inbox");

  const renderSection = () => {
    switch (activeSection) {
      case "inbox":
        return <SuperAdminWhatsAppInbox />;
      case "conversations":
        return <SuperAdminWhatsAppInbox />; // Reutiliza inbox por enquanto
      case "contacts":
        return (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Contatos - Em breve</p>
          </div>
        );
      case "settings":
        return (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Configurações - Em breve</p>
          </div>
        );
      default:
        return <SuperAdminWhatsAppInbox />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background">
      <SuperAdminWhatsAppSidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      <main className="flex-1 overflow-hidden">
        {renderSection()}
      </main>
    </div>
  );
};
