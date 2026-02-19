import { useState } from "react";
import { WhatsAppSidebar } from "./WhatsAppSidebar";
import { WhatsAppInbox } from "./sections/WhatsAppInbox";
import { WhatsAppAllConversations } from "./sections/WhatsAppAllConversations";
import { WhatsAppConversations } from "./sections/WhatsAppConversations";
import { WhatsAppKanban } from "./sections/WhatsAppKanban";
import { WhatsAppContacts } from "./sections/WhatsAppContacts";
import { WhatsAppReports } from "./sections/WhatsAppReports";
import { WhatsAppCampaigns } from "./sections/WhatsAppCampaigns";
import { WhatsAppHelp } from "./sections/WhatsAppHelp";
import { WhatsAppProjects } from "./sections/WhatsAppProjects";

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
import { WhatsAppSection } from "./WhatsAppDrawer";
import { CRMTopbar } from "./components/CRMTopbar";

export const WhatsAppLayout = () => {
  const [activeSection, setActiveSection] = useState<WhatsAppSection>("inbox");
  const [selectedKanbanAgent, setSelectedKanbanAgent] = useState<{ id: string; name: string } | null>(null);
  const [initialConversationPhone, setInitialConversationPhone] = useState<string | null>(null);
  const [projectsDrawerOpen, setProjectsDrawerOpen] = useState(false);

  const handleGoBack = () => {
    window.close();
  };

  const handleKanbanAgentSelect = (agentId: string, agentName: string) => {
    setSelectedKanbanAgent({ id: agentId, name: agentName });
  };

  const handleOpenConversation = (phone: string) => {
    setInitialConversationPhone(phone);
    setActiveSection("inbox");
  };

  const renderOtherSection = () => {
    switch (activeSection) {
      case "all-conversations":
        return <WhatsAppAllConversations />;
      case "conversations":
        return <WhatsAppConversations />;
      case "kanban":
        return selectedKanbanAgent ? (
          <WhatsAppKanban agentId={selectedKanbanAgent.id} agentName={selectedKanbanAgent.name} onOpenConversation={handleOpenConversation} />
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
      case "projects":
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      <CRMTopbar onSectionChange={setActiveSection} />
      <div className="flex flex-1 overflow-hidden">
        <WhatsAppSidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
          onClose={handleGoBack}
          onKanbanAgentSelect={handleKanbanAgentSelect}
          selectedKanbanAgentId={selectedKanbanAgent?.id}
          onOpenProjects={() => setProjectsDrawerOpen(true)}
          projectsDrawerOpen={projectsDrawerOpen}
        />
        <main className="flex-1 overflow-hidden relative">
          <div className={activeSection === "inbox" ? "h-full" : "hidden"}>
            <WhatsAppInbox initialConversationPhone={initialConversationPhone} onConversationOpened={() => setInitialConversationPhone(null)} />
          </div>
          {activeSection !== "inbox" && (
            <div className="absolute inset-0 z-10 bg-background">
              {renderOtherSection()}
            </div>
          )}
        </main>
      </div>
      <WhatsAppProjects open={projectsDrawerOpen} onOpenChange={setProjectsDrawerOpen} />
    </div>
  );
};
