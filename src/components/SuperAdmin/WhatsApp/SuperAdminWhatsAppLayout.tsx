import { useState } from "react";
import { SuperAdminWhatsAppSidebar } from "./SuperAdminWhatsAppSidebar";
import { SuperAdminWhatsAppInbox } from "./SuperAdminWhatsAppInbox";
import { WhatsAppConversations } from "@/components/WhatsApp/sections/WhatsAppConversations";
import { WhatsAppKanban } from "@/components/WhatsApp/sections/WhatsAppKanban";
import { WhatsAppContacts } from "@/components/WhatsApp/sections/WhatsAppContacts";
import { WhatsAppReports } from "@/components/WhatsApp/sections/WhatsAppReports";
import { WhatsAppCampaigns } from "@/components/WhatsApp/sections/WhatsAppCampaigns";
import { WhatsAppHelp } from "@/components/WhatsApp/sections/WhatsAppHelp";

// Settings sections - Super Admin specific
import { SuperAdminAgentsSettings } from "./SuperAdminAgentsSettings";

// Settings sections (shared with tenant)
import { WhatsAppAccountSettings } from "@/components/WhatsApp/settings/WhatsAppAccountSettings";
import { WhatsAppTeamsSettings } from "@/components/WhatsApp/settings/WhatsAppTeamsSettings";
import { WhatsAppInboxSettings } from "@/components/WhatsApp/settings/WhatsAppInboxSettings";
import { WhatsAppLabelsSettings } from "@/components/WhatsApp/settings/WhatsAppLabelsSettings";
import { WhatsAppAttributesSettings } from "@/components/WhatsApp/settings/WhatsAppAttributesSettings";
import { WhatsAppKanbanSettings } from "@/components/WhatsApp/settings/WhatsAppKanbanSettings";
import { WhatsAppAutomationSettings } from "@/components/WhatsApp/settings/WhatsAppAutomationSettings";
import { WhatsAppN8NSettings } from "@/components/WhatsApp/settings/WhatsAppN8NSettings";
import { WhatsAppBotsSettings } from "@/components/WhatsApp/settings/WhatsAppBotsSettings";
import { WhatsAppTypebotSettings } from "@/components/WhatsApp/settings/WhatsAppTypebotSettings";
import { WhatsAppMacrosSettings } from "@/components/WhatsApp/settings/WhatsAppMacrosSettings";
import { WhatsAppCannedResponses } from "@/components/WhatsApp/settings/WhatsAppCannedResponses";
import { WhatsAppAppsSettings } from "@/components/WhatsApp/settings/WhatsAppAppsSettings";
import { WhatsAppIntegrationsSettings } from "@/components/WhatsApp/settings/WhatsAppIntegrationsSettings";
import { WhatsAppPermissionsSettings } from "@/components/WhatsApp/settings/WhatsAppPermissionsSettings";

export type SuperAdminWhatsAppSection = 
  | "inbox" 
  | "conversations" 
  | "kanban"
  | "contacts" 
  | "reports"
  | "campaigns"
  | "help"
  // Settings sections (same as tenant)
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

export const SuperAdminWhatsAppLayout = () => {
  const [activeSection, setActiveSection] = useState<SuperAdminWhatsAppSection>("inbox");
  const [selectedKanbanAgent, setSelectedKanbanAgent] = useState<{ id: string; name: string } | null>(null);

  const renderSection = () => {
    switch (activeSection) {
      case "inbox":
        return <SuperAdminWhatsAppInbox />;
      case "conversations":
        return <WhatsAppConversations />;
      case "kanban":
        return selectedKanbanAgent ? (
          <WhatsAppKanban agentId={selectedKanbanAgent.id} agentName={selectedKanbanAgent.name} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Selecione um agente no menu para ver o Kanban</p>
          </div>
        );
      case "contacts":
        return <WhatsAppContacts />;
      case "reports":
        return <WhatsAppReports />;
      case "campaigns":
        return <WhatsAppCampaigns />;
      case "help":
        return <WhatsAppHelp />;
      // Settings sections (same as tenant)
      case "account":
        return <WhatsAppAccountSettings />;
      case "agents":
        return <SuperAdminAgentsSettings />;
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
        return <SuperAdminWhatsAppInbox />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background">
      <SuperAdminWhatsAppSidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
        onKanbanAgentSelect={(agentId, agentName) => {
          setSelectedKanbanAgent({ id: agentId, name: agentName });
          setActiveSection("kanban");
        }}
        selectedKanbanAgentId={selectedKanbanAgent?.id}
      />
      <main className="flex-1 overflow-hidden">
        {renderSection()}
      </main>
    </div>
  );
};
