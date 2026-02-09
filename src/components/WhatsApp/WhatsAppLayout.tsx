import { useState } from "react";
import { WhatsAppSidebar } from "./WhatsAppSidebar";
import { WhatsAppInbox } from "./sections/WhatsAppInbox";
import { WhatsAppConversations } from "./sections/WhatsAppConversations";
import { WhatsAppKanban } from "./sections/WhatsAppKanban";
import { WhatsAppContacts } from "./sections/WhatsAppContacts";
import { WhatsAppReports } from "./sections/WhatsAppReports";
import { WhatsAppCampaigns } from "./sections/WhatsAppCampaigns";
import { WhatsAppHelp } from "./sections/WhatsAppHelp";
import { WhatsAppSettingsLayout } from "./settings/WhatsAppSettingsLayout";

export type WhatsAppSection = 
  | "inbox" 
  | "conversations" 
  | "kanban" 
  | "contacts" 
  | "reports" 
  | "campaigns" 
  | "help" 
  | "settings";

export const WhatsAppLayout = () => {
  const [activeSection, setActiveSection] = useState<WhatsAppSection>("inbox");

  const handleBackFromSettings = () => {
    setActiveSection("inbox");
  };

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
        return <WhatsAppSettingsLayout onBack={handleBackFromSettings} />;
      default:
        return <WhatsAppInbox />;
    }
  };

  // Se estiver em settings, não mostra a sidebar principal
  if (activeSection === "settings") {
    return (
      <div className="flex h-screen w-full bg-background">
        {renderSection()}
      </div>
    );
  }

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
