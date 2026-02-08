import { useState } from "react";
import { SuperAdminWhatsAppSidebar } from "./SuperAdminWhatsAppSidebar";
import { SuperAdminWhatsAppInbox } from "./SuperAdminWhatsAppInbox";
import { WhatsAppConversations } from "@/components/WhatsApp/sections/WhatsAppConversations";
import { WhatsAppKanban } from "@/components/WhatsApp/sections/WhatsAppKanban";
import { WhatsAppContacts } from "@/components/WhatsApp/sections/WhatsAppContacts";
import { WhatsAppReports } from "@/components/WhatsApp/sections/WhatsAppReports";
import { WhatsAppCampaigns } from "@/components/WhatsApp/sections/WhatsAppCampaigns";
import { WhatsAppHelp } from "@/components/WhatsApp/sections/WhatsAppHelp";
import { WhatsAppSettings } from "@/components/WhatsApp/sections/WhatsAppSettings";

export type SuperAdminWhatsAppSection = 
  | "inbox" 
  | "conversations" 
  | "kanban"
  | "contacts" 
  | "reports"
  | "campaigns"
  | "help"
  | "settings";

export const SuperAdminWhatsAppLayout = () => {
  const [activeSection, setActiveSection] = useState<SuperAdminWhatsAppSection>("inbox");

  const renderSection = () => {
    switch (activeSection) {
      case "inbox":
        return <SuperAdminWhatsAppInbox />;
      case "conversations":
        return <WhatsAppConversations />;
      case "kanban":
        return <WhatsAppKanban />;
      case "contacts":
        return <WhatsAppContacts />;
      case "reports":
        return <WhatsAppReports />;
      case "campaigns":
        return <WhatsAppCampaigns />;
      case "help":
        return <WhatsAppHelp />;
      case "settings":
        return <WhatsAppSettings />;
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
