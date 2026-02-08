import { useState } from "react";
import { WhatsAppSidebar } from "./WhatsAppSidebar";
import { WhatsAppInbox } from "./sections/WhatsAppInbox";
import { WhatsAppConversations } from "./sections/WhatsAppConversations";
import { WhatsAppKanban } from "./sections/WhatsAppKanban";
import { WhatsAppContacts } from "./sections/WhatsAppContacts";
import { WhatsAppReports } from "./sections/WhatsAppReports";
import { WhatsAppCampaigns } from "./sections/WhatsAppCampaigns";
import { WhatsAppHelp } from "./sections/WhatsAppHelp";
import { WhatsAppSettings } from "./sections/WhatsAppSettings";
import { WhatsAppAISettings } from "./settings/WhatsAppAISettings";

export type WhatsAppSection = 
  | "inbox" 
  | "conversations" 
  | "kanban" 
  | "contacts" 
  | "reports" 
  | "campaigns" 
  | "help" 
  | "settings"
  | "settings-leads"
  | "ai-settings";

export const WhatsAppLayout = () => {
  const [activeSection, setActiveSection] = useState<WhatsAppSection>("inbox");

  const renderSection = () => {
    switch (activeSection) {
      case "inbox":
        return <WhatsAppInbox />;
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
      case "settings-leads":
        return <WhatsAppSettings />;
      case "ai-settings":
        return <WhatsAppAISettings />;
      default:
        return <WhatsAppInbox />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background">
      <WhatsAppSidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      <main className="flex-1 overflow-hidden">
        {renderSection()}
      </main>
    </div>
  );
};
