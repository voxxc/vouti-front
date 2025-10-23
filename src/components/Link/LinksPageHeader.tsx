import { Button } from "@/components/ui/button";
import { Settings, Sparkles, Palette } from "lucide-react";

interface LinksPageHeaderProps {
  onEnhanceClick?: () => void;
  onDesignClick?: () => void;
  onSettingsClick?: () => void;
}

export const LinksPageHeader = ({
  onEnhanceClick,
  onDesignClick,
  onSettingsClick,
}: LinksPageHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-semibold text-foreground">Links</h1>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onEnhanceClick}
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Enhance
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDesignClick}
          className="gap-2"
        >
          <Palette className="w-4 h-4" />
          Design
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
