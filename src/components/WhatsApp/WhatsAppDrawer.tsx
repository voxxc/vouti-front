import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { WhatsAppSidebar } from "./WhatsAppSidebar";
import { WhatsAppInbox } from "./sections/WhatsAppInbox";
import { WhatsAppAllConversations } from "./sections/WhatsAppAllConversations";
import { WhatsAppConversations } from "./sections/WhatsAppConversations";
import { WhatsAppKanban } from "./sections/WhatsAppKanban";
import { WhatsAppContacts } from "./sections/WhatsAppContacts";
import { Users2 } from "lucide-react";
import { WhatsAppReports } from "./sections/WhatsAppReports";
import { WhatsAppCampaigns } from "./sections/WhatsAppCampaigns";
import { WhatsAppHelp } from "./sections/WhatsAppHelp";
import { WhatsAppLabelConversations } from "./sections/WhatsAppLabelConversations";

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
  | "all-conversations"
  | "label-filter"
  | "team-filter"
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
  const [selectedKanbanAgent, setSelectedKanbanAgent] = useState<{ id: string; name: string } | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<{ id: string; name: string } | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string } | null>(null);

  const handleKanbanAgentSelect = (agentId: string, agentName: string) => {
    setSelectedKanbanAgent({ id: agentId, name: agentName });
  };

  const handleLabelSelect = (labelId: string, labelName: string) => {
    setSelectedLabel({ id: labelId, name: labelName });
  };

  const handleTeamSelect = (teamId: string, teamName: string) => {
    setSelectedTeam({ id: teamId, name: teamName });
  };

  const renderSection = () => {
    switch (activeSection) {
      case "inbox":
        return <WhatsAppInbox />;
      case "all-conversations":
        return <WhatsAppAllConversations />;
      case "label-filter":
        return selectedLabel ? (
          <WhatsAppLabelConversations labelId={selectedLabel.id} labelName={selectedLabel.name} />
        ) : null;
      case "team-filter":
        return selectedTeam ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Users2 className="h-12 w-12 mx-auto opacity-50" />
              <p className="text-lg font-medium">Time: {selectedTeam.name}</p>
              <p className="text-sm">Visualização por time será desenvolvida em breve</p>
            </div>
          </div>
        ) : null;
      case "conversations":
        return <WhatsAppConversations />;
      case "kanban":
        return null;
      case "contacts":
        return <WhatsAppContacts onStartConversation={(phone, name) => {
          setActiveSection("inbox");
        }} />;
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
        <SheetTitle className="sr-only">Vouti.CRM</SheetTitle>
        
        <div className="flex h-full">
          <WhatsAppSidebar 
            activeSection={activeSection} 
            onSectionChange={setActiveSection}
            onClose={() => onOpenChange(false)}
            onKanbanAgentSelect={handleKanbanAgentSelect}
            selectedKanbanAgentId={selectedKanbanAgent?.id}
            onLabelSelect={handleLabelSelect}
            selectedLabelId={selectedLabel?.id}
            onTeamSelect={handleTeamSelect}
            selectedTeamId={selectedTeam?.id}
          />
          <main className="flex-1 overflow-hidden relative">
            {/* Kanban always mounted for background polling */}
            {selectedKanbanAgent && (
              <div className={activeSection === "kanban" ? "h-full" : "hidden"}>
                <WhatsAppKanban agentId={selectedKanbanAgent.id} agentName={selectedKanbanAgent.name} />
              </div>
            )}
            {activeSection !== "kanban" && renderSection()}
          </main>
        </div>
      </SheetContent>
    </Sheet>
  );
}
