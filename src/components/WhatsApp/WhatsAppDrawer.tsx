import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { WhatsAppSidebar } from "./WhatsAppSidebar";
import { WhatsAppInbox } from "./sections/WhatsAppInbox";
import { WhatsAppConversations } from "./sections/WhatsAppConversations";
import { WhatsAppKanban } from "./sections/WhatsAppKanban";
import { WhatsAppContacts } from "./sections/WhatsAppContacts";
import { WhatsAppReports } from "./sections/WhatsAppReports";
import { WhatsAppCampaigns } from "./sections/WhatsAppCampaigns";
import { WhatsAppHelp } from "./sections/WhatsAppHelp";

// Settings sections
import { WhatsAppAccountSettings } from "./settings/WhatsAppAccountSettings";
import { WhatsAppAgentsSettings } from "./settings/WhatsAppAgentsSettings";
import { WhatsAppTeamsSettings } from "./settings/WhatsAppTeamsSettings";
import { WhatsAppInboxSettings } from "./settings/WhatsAppInboxSettings";
import { WhatsAppLabelsSettings } from "./settings/WhatsAppLabelsSettings";
import { WhatsAppAttributesSettings } from "./settings/WhatsAppAttributesSettings";
import { WhatsAppKanbanSettings } from "./settings/WhatsAppKanbanSettings";
import { WhatsAppAutomationSettings } from "./settings/WhatsAppAutomationSettings";
import { WhatsAppN8NSettings } from "./settings/WhatsAppN8NSettings";
import { WhatsAppBotsSettings } from "./settings/WhatsAppBotsSettings";
import { WhatsAppTypebotSettings } from "./settings/WhatsAppTypebotSettings";
import { WhatsAppMacrosSettings } from "./settings/WhatsAppMacrosSettings";
import { WhatsAppCannedResponses } from "./settings/WhatsAppCannedResponses";
import { WhatsAppAppsSettings } from "./settings/WhatsAppAppsSettings";
import { WhatsAppIntegrationsSettings } from "./settings/WhatsAppIntegrationsSettings";
import { WhatsAppPermissionsSettings } from "./settings/WhatsAppPermissionsSettings";

export type WhatsAppSection = 
  | "inbox" 
  | "conversations" 
  | "kanban" 
  | "contacts" 
  | "reports" 
  | "campaigns" 
  | "help"
  // Settings sections
  | "account"
  | "agents"
  | "teams"
  | "inboxes"
  | "labels"
  | "attributes"
  | "kanban-settings"
  | "automation"
  | "n8n"
  | "bots"
  | "typebot"
  | "macros"
  | "canned"
  | "apps"
  | "integrations"
  | "permissions";

interface WhatsAppDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsAppDrawer({ open, onOpenChange }: WhatsAppDrawerProps) {
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
      // Settings
      case "account":
        return <WhatsAppAccountSettings />;
      case "agents":
        return <WhatsAppAgentsSettings />;
      case "teams":
        return <WhatsAppTeamsSettings />;
      case "inboxes":
        return <WhatsAppInboxSettings />;
      case "labels":
        return <WhatsAppLabelsSettings />;
      case "attributes":
        return <WhatsAppAttributesSettings />;
      case "kanban-settings":
        return <WhatsAppKanbanSettings />;
      case "automation":
        return <WhatsAppAutomationSettings />;
      case "n8n":
        return <WhatsAppN8NSettings />;
      case "bots":
        return <WhatsAppBotsSettings />;
      case "typebot":
        return <WhatsAppTypebotSettings />;
      case "macros":
        return <WhatsAppMacrosSettings />;
      case "canned":
        return <WhatsAppCannedResponses />;
      case "apps":
        return <WhatsAppAppsSettings />;
      case "integrations":
        return <WhatsAppIntegrationsSettings />;
      case "permissions":
        return <WhatsAppPermissionsSettings />;
      default:
        return <WhatsAppInbox />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent 
        side="inset"
        className="p-0 flex flex-col"
      >
        <SheetTitle className="sr-only">Vouti.Bot</SheetTitle>
        
        <div className="flex h-full">
          <WhatsAppSidebar 
            activeSection={activeSection} 
            onSectionChange={setActiveSection}
            onClose={() => onOpenChange(false)}
          />
          <main className="flex-1 overflow-hidden">
            {renderSection()}
          </main>
        </div>
      </SheetContent>
    </Sheet>
  );
}
