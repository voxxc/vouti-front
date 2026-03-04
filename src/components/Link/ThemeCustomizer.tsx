import { useState } from "react";
import { LinkProfile } from "@/types/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeCustomizerProps {
  profile: LinkProfile;
  onSave: (data: Partial<LinkProfile>) => Promise<void>;
}

const PRESETS = [
  { name: "Clássico", bg1: "#FFFFFF", bg2: null, btn: "#1e293b", btnText: "#ffffff" },
  { name: "Oceano", bg1: "#0ea5e9", bg2: "#1e3a5f", btn: "#ffffff", btnText: "#0ea5e9" },
  { name: "Sunset", bg1: "#f97316", bg2: "#ec4899", btn: "#ffffff", btnText: "#f97316" },
  { name: "Roxo", bg1: "#8b5cf6", bg2: "#6d28d9", btn: "#ffffff", btnText: "#7c3aed" },
  { name: "Escuro", bg1: "#0f172a", bg2: "#1e293b", btn: "#e2e8f0", btnText: "#0f172a" },
  { name: "Verde", bg1: "#10b981", bg2: "#059669", btn: "#ffffff", btnText: "#059669" },
  { name: "Rosa", bg1: "#f472b6", bg2: "#ec4899", btn: "#ffffff", btnText: "#db2777" },
  { name: "Neutro", bg1: "#f8fafc", bg2: null, btn: "#334155", btnText: "#ffffff" },
];

const DIRECTIONS = [
  { value: "to-b", label: "↓", icon: ArrowDown, desc: "Cima → Baixo" },
  { value: "to-t", label: "↑", icon: ArrowUp, desc: "Baixo → Cima" },
  { value: "to-r", label: "→", icon: ArrowRight, desc: "Esq → Dir" },
  { value: "to-l", label: "←", icon: ArrowLeft, desc: "Dir → Esq" },
];

export const ThemeCustomizer = ({ profile, onSave }: ThemeCustomizerProps) => {
  const [bgColor1, setBgColor1] = useState(profile.bg_color_1 || "#FFFFFF");
  const [bgColor2, setBgColor2] = useState(profile.bg_color_2 || "");
  const [gradientEnabled, setGradientEnabled] = useState(!!profile.bg_color_2);
  const [direction, setDirection] = useState(profile.bg_gradient_direction || "to-b");
  const [buttonColor, setButtonColor] = useState(profile.button_color || "#1e293b");
  const [buttonTextColor, setButtonTextColor] = useState(profile.button_text_color || "#ffffff");
  const [saving, setSaving] = useState(false);

  const handleLiveUpdate = (updates: Partial<{
    bg_color_1: string; bg_color_2: string | null; bg_gradient_direction: string;
    button_color: string; button_text_color: string;
  }>) => {
    onSave(updates).catch(() => {});
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setBgColor1(preset.bg1);
    setBgColor2(preset.bg2 || "");
    setGradientEnabled(!!preset.bg2);
    setButtonColor(preset.btn);
    setButtonTextColor(preset.btnText);
    handleLiveUpdate({
      bg_color_1: preset.bg1,
      bg_color_2: preset.bg2,
      bg_gradient_direction: direction,
      button_color: preset.btn,
      button_text_color: preset.btnText,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        bg_color_1: bgColor1,
        bg_color_2: gradientEnabled && bgColor2 ? bgColor2 : null,
        bg_gradient_direction: direction,
        button_color: buttonColor,
        button_text_color: buttonTextColor,
      });
      toast.success("Tema salvo com sucesso!");
    } catch {
      toast.error("Erro ao salvar tema");
    } finally {
      setSaving(false);
    }
  };

  const updateAndPreview = (field: string, value: string | null) => {
    const updates: any = {
      bg_color_1: bgColor1,
      bg_color_2: gradientEnabled && bgColor2 ? bgColor2 : null,
      bg_gradient_direction: direction,
      button_color: buttonColor,
      button_text_color: buttonTextColor,
      [field]: value,
    };
    handleLiveUpdate(updates);
  };

  return (
    <div className="space-y-6">
      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Paletas Pré-definidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary transition-colors"
              >
                <div
                  className="w-full h-10 rounded-lg border border-border/50"
                  style={{
                    background: preset.bg2
                      ? `linear-gradient(to bottom, ${preset.bg1}, ${preset.bg2})`
                      : preset.bg1,
                  }}
                />
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Background Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cor de Fundo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="min-w-[100px]">Cor Principal</Label>
            <input
              type="color"
              value={bgColor1}
              onChange={(e) => {
                setBgColor1(e.target.value);
                updateAndPreview("bg_color_1", e.target.value);
              }}
              className="w-12 h-10 rounded cursor-pointer border border-border"
            />
            <span className="text-sm text-muted-foreground font-mono">{bgColor1}</span>
          </div>

          <div className="flex items-center gap-4">
            <Label className="min-w-[100px]">Gradiente</Label>
            <Switch
              checked={gradientEnabled}
              onCheckedChange={(checked) => {
                setGradientEnabled(checked);
                updateAndPreview("bg_color_2", checked && bgColor2 ? bgColor2 : null);
              }}
            />
          </div>

          {gradientEnabled && (
            <>
              <div className="flex items-center gap-4">
                <Label className="min-w-[100px]">Cor Secundária</Label>
                <input
                  type="color"
                  value={bgColor2 || "#000000"}
                  onChange={(e) => {
                    setBgColor2(e.target.value);
                    updateAndPreview("bg_color_2", e.target.value);
                  }}
                  className="w-12 h-10 rounded cursor-pointer border border-border"
                />
                <span className="text-sm text-muted-foreground font-mono">{bgColor2}</span>
              </div>

              <div>
                <Label className="mb-2 block">Direção do Gradiente</Label>
                <div className="flex gap-2">
                  {DIRECTIONS.map((dir) => (
                    <button
                      key={dir.value}
                      onClick={() => {
                        setDirection(dir.value);
                        updateAndPreview("bg_gradient_direction", dir.value);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all",
                        direction === dir.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      <dir.icon className="h-5 w-5" />
                      <span className="text-xs">{dir.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Button Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cor dos Botões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="min-w-[100px]">Fundo</Label>
            <input
              type="color"
              value={buttonColor}
              onChange={(e) => {
                setButtonColor(e.target.value);
                updateAndPreview("button_color", e.target.value);
              }}
              className="w-12 h-10 rounded cursor-pointer border border-border"
            />
            <span className="text-sm text-muted-foreground font-mono">{buttonColor}</span>
          </div>

          <div className="flex items-center gap-4">
            <Label className="min-w-[100px]">Texto</Label>
            <input
              type="color"
              value={buttonTextColor}
              onChange={(e) => {
                setButtonTextColor(e.target.value);
                updateAndPreview("button_text_color", e.target.value);
              }}
              className="w-12 h-10 rounded cursor-pointer border border-border"
            />
            <span className="text-sm text-muted-foreground font-mono">{buttonTextColor}</span>
          </div>

          {/* Preview Button */}
          <div className="pt-2">
            <Label className="mb-2 block text-muted-foreground">Preview do botão:</Label>
            <div
              className="w-full py-4 px-5 text-center font-medium rounded-2xl"
              style={{ backgroundColor: buttonColor, color: buttonTextColor }}
            >
              Exemplo de Link
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <Button onClick={handleSave} disabled={saving} className="w-full h-12 text-base">
        {saving ? "Salvando..." : "Salvar Tema"}
      </Button>
    </div>
  );
};
