import { useState } from "react";
import { WhatsAppSettingsSidebar, SettingsSection } from "./WhatsAppSettingsSidebar";
import { WhatsAppAccountSettings } from "./WhatsAppAccountSettings";
import { WhatsAppAgentsSettings } from "./WhatsAppAgentsSettings";
import { WhatsAppTeamsSettings } from "./WhatsAppTeamsSettings";
import { WhatsAppInboxSettings } from "./WhatsAppInboxSettings";
import { WhatsAppLabelsSettings } from "./WhatsAppLabelsSettings";
import { WhatsAppAttributesSettings } from "./WhatsAppAttributesSettings";
import { WhatsAppKanbanSettings } from "./WhatsAppKanbanSettings";
import { WhatsAppAutomationSettings } from "./WhatsAppAutomationSettings";
import { WhatsAppN8NSettings } from "./WhatsAppN8NSettings";
import { WhatsAppBotsSettings } from "./WhatsAppBotsSettings";
import { WhatsAppTypebotSettings } from "./WhatsAppTypebotSettings";
import { WhatsAppMacrosSettings } from "./WhatsAppMacrosSettings";
import { WhatsAppCannedResponses } from "./WhatsAppCannedResponses";
import { WhatsAppAppsSettings } from "./WhatsAppAppsSettings";
import { WhatsAppIntegrationsSettings } from "./WhatsAppIntegrationsSettings";
import { WhatsAppPermissionsSettings } from "./WhatsAppPermissionsSettings";

interface WhatsAppSettingsLayoutProps {
  onBack: () => void;
}

export const WhatsAppSettingsLayout = ({ onBack }: WhatsAppSettingsLayoutProps) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>("account");

  const renderSection = () => {
    switch (activeSection) {
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
      case "kanban":
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
        return <WhatsAppAccountSettings />;
    }
  };

  return (
    <div className="flex h-full w-full">
      <WhatsAppSettingsSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onBack={onBack}
      />
      <main className="flex-1 overflow-hidden">
        {renderSection()}
      </main>
    </div>
  );
};
