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
import { WhatsAppCommanderSettings } from "./settings/WhatsAppCommanderSettings";
import { WhatsAppSection } from "./WhatsAppDrawer";
import { CRMTopbar } from "./components/CRMTopbar";

export const WhatsAppLayout = () => {
  const [activeSection, setActiveSection] = useState<WhatsAppSection>("inbox");
  const [selectedKanbanAgent, setSelectedKanbanAgent] = useState<{ id: string; name: string } | null>(null);
  const [initialConversationPhone, setInitialConversationPhone] = useState<string | null>(null);
  const [projectsDrawerOpen, setProjectsDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const renderSettingsSection = () => {
    switch (activeSection) {
      case "account": return <WhatsAppAccountSettings />;
      case "agents": return <WhatsAppAgentsSettings />;
      case "teams": return <WhatsAppTeamsSettings />;
      case "inboxes": return <WhatsAppInboxSettings />;
      case "labels": return <WhatsAppLabelsSettings />;
      case "attributes": return <WhatsAppAttributesSettings />;
      case "kanban-settings": return <WhatsAppKanbanSettings />;
      case "automation": return <WhatsAppAutomationSettings />;
      case "n8n": return <WhatsAppN8NSettings />;
      case "bots": return <WhatsAppBotsSettings />;
      case "typebot": return <WhatsAppTypebotSettings />;
      case "macros": return <WhatsAppMacrosSettings />;
      case "canned": return <WhatsAppCannedResponses />;
      case "apps": return <WhatsAppAppsSettings />;
      case "integrations": return <WhatsAppIntegrationsSettings />;
      case "permissions": return <WhatsAppPermissionsSettings />;
      case "commander": return <WhatsAppCommanderSettings />;
      default: return null;
    }
  };

  const isSettingsSection = [
    "account", "agents", "teams", "inboxes", "labels", "attributes",
    "kanban-settings", "automation", "n8n", "bots", "typebot", "macros",
    "canned", "apps", "integrations", "permissions", "commander"
  ].includes(activeSection);

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      <CRMTopbar
        onSectionChange={setActiveSection}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
      />
      <div className="flex flex-1 overflow-hidden">
        <WhatsAppSidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
          onClose={handleGoBack}
          onKanbanAgentSelect={handleKanbanAgentSelect}
          selectedKanbanAgentId={selectedKanbanAgent?.id}
          onOpenProjects={() => setProjectsDrawerOpen(true)}
          projectsDrawerOpen={projectsDrawerOpen}
          collapsed={sidebarCollapsed}
        />
        <main className="flex-1 overflow-hidden relative">
          {/* Inbox - always mounted */}
          <div className={activeSection === "inbox" ? "h-full" : "hidden"}>
            <WhatsAppInbox initialConversationPhone={initialConversationPhone} onConversationOpened={() => setInitialConversationPhone(null)} />
          </div>

          {/* Pre-mounted main sections (background loading) */}
          <div className={activeSection === "all-conversations" ? "absolute inset-0 z-10 bg-background" : "hidden"}>
            <WhatsAppAllConversations />
          </div>
          <div className={activeSection === "conversations" ? "absolute inset-0 z-10 bg-background" : "hidden"}>
            <WhatsAppConversations />
          </div>
          <div className={activeSection === "contacts" ? "absolute inset-0 z-10 bg-background" : "hidden"}>
            <WhatsAppContacts />
          </div>
          <div className={activeSection === "reports" ? "absolute inset-0 z-10 bg-background" : "hidden"}>
            <WhatsAppReports />
          </div>
          <div className={activeSection === "campaigns" ? "absolute inset-0 z-10 bg-background" : "hidden"}>
            <WhatsAppCampaigns />
          </div>
          <div className={activeSection === "help" ? "absolute inset-0 z-10 bg-background" : "hidden"}>
            <WhatsAppHelp />
          </div>

          {/* Kanban - mounted when agent selected */}
          {selectedKanbanAgent && (
            <div className={activeSection === "kanban" ? "absolute inset-0 z-10 bg-background" : "hidden"}>
              <WhatsAppKanban agentId={selectedKanbanAgent.id} agentName={selectedKanbanAgent.name} onOpenConversation={handleOpenConversation} />
            </div>
          )}

          {/* Settings sections - rendered conditionally (lightweight) */}
          {isSettingsSection && (
            <div className="absolute inset-0 z-10 bg-background">
              {renderSettingsSection()}
            </div>
          )}
        </main>
      </div>
      <WhatsAppProjects open={projectsDrawerOpen} onOpenChange={setProjectsDrawerOpen} sidebarCollapsed={sidebarCollapsed} />
    </div>
  );
};
