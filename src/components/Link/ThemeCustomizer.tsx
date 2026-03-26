import { useState, useRef } from "react";
import { LinkProfile } from "@/types/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ArrowRight, ArrowLeft, Upload, Trash2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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

const FONT_SIZES = [
  { value: "sm", label: "P" },
  { value: "base", label: "M" },
  { value: "lg", label: "G" },
  { value: "xl", label: "GG" },
  { value: "2xl", label: "XG" },
  { value: "3xl", label: "XXG" },
];

const BUTTON_STYLES = [
  { value: "filled", label: "Preenchido" },
  { value: "outline", label: "Contorno" },
  { value: "soft", label: "Suave" },
  { value: "shadow", label: "Sombra" },
];

const BUTTON_RADIUS = [
  { value: "none", label: "Reto" },
  { value: "md", label: "Médio" },
  { value: "xl", label: "Arredondado" },
  { value: "full", label: "Pílula" },
];

const BUTTON_PADDING = [
  { value: "compact", label: "Compacto" },
  { value: "normal", label: "Normal" },
  { value: "spacious", label: "Espaçoso" },
];

const BUTTON_SPACING = [
  { value: "tight", label: "Apertado" },
  { value: "normal", label: "Normal" },
  { value: "spacious", label: "Espaçoso" },
];

const VERTICAL_POSITIONS = [
  { value: "top", label: "Topo" },
  { value: "center", label: "Centro" },
  { value: "bottom", label: "Baixo" },
];

const RADIUS_PREVIEW: Record<string, string> = {
  none: "0px",
  md: "8px",
  xl: "16px",
  full: "9999px",
};

export const ThemeCustomizer = ({ profile, onSave }: ThemeCustomizerProps) => {
  const [bgColor1, setBgColor1] = useState(profile.bg_color_1 || "#FFFFFF");
  const [bgColor2, setBgColor2] = useState(profile.bg_color_2 || "");
  const [gradientEnabled, setGradientEnabled] = useState(!!profile.bg_color_2);
  const [direction, setDirection] = useState(profile.bg_gradient_direction || "to-b");
  const [buttonColor, setButtonColor] = useState(profile.button_color || "#1e293b");
  const [buttonTextColor, setButtonTextColor] = useState(profile.button_text_color || "#ffffff");
  const [usernameColor, setUsernameColor] = useState(profile.username_color || profile.button_text_color || "#1e293b");
  const [usernameFontSize, setUsernameFontSize] = useState(profile.username_font_size || "xl");
  const [bgImageUrl, setBgImageUrl] = useState(profile.bg_image_url || "");
  const [uploadingBg, setUploadingBg] = useState(false);
  const [saving, setSaving] = useState(false);
  const bgFileRef = useRef<HTMLInputElement>(null);

  // Button style states
  const [buttonStyle, setButtonStyle] = useState(profile.button_style || "filled");
  const [buttonRadius, setButtonRadius] = useState(profile.button_radius || "xl");
  const [buttonPadding, setButtonPadding] = useState(profile.button_padding || "normal");
  const [buttonSpacing, setButtonSpacing] = useState(profile.button_spacing || "normal");
  const [buttonBorderColor, setButtonBorderColor] = useState(profile.button_border_color || "");

  // Sub-button style states
  const [subButtonStyle, setSubButtonStyle] = useState(profile.sub_button_style || "soft");
  const [subButtonRadius, setSubButtonRadius] = useState(profile.sub_button_radius || "xl");
  const [subButtonPadding, setSubButtonPadding] = useState(profile.sub_button_padding || "compact");
  const [subButtonColor, setSubButtonColor] = useState(profile.sub_button_color || "");
  const [subButtonTextColor, setSubButtonTextColor] = useState(profile.sub_button_text_color || "");
  const [verticalPosition, setVerticalPosition] = useState(profile.content_vertical_position || "top");

  const handleLiveUpdate = (updates: Partial<LinkProfile>) => {
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
        username_color: usernameColor,
        username_font_size: usernameFontSize,
        button_style: buttonStyle,
        button_radius: buttonRadius,
        button_padding: buttonPadding,
        button_spacing: buttonSpacing,
        button_border_color: buttonBorderColor || null,
        sub_button_style: subButtonStyle,
        sub_button_radius: subButtonRadius,
        sub_button_padding: subButtonPadding,
        sub_button_color: subButtonColor || null,
        sub_button_text_color: subButtonTextColor || null,
        content_vertical_position: verticalPosition,
      });
      toast.success("Tema salvo com sucesso!");
    } catch {
      toast.error("Erro ao salvar tema");
    } finally {
      setSaving(false);
    }
  };

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Máximo 5MB"); return; }
    
    setUploadingBg(true);
    try {
      const fileName = `${profile.user_id}/bg-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from("link-backgrounds").upload(fileName, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("link-backgrounds").getPublicUrl(fileName);
      setBgImageUrl(urlData.publicUrl);
      await onSave({ bg_image_url: urlData.publicUrl });
      toast.success("Imagem de fundo salva!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploadingBg(false);
      if (bgFileRef.current) bgFileRef.current.value = "";
    }
  };

  const handleRemoveBgImage = async () => {
    setBgImageUrl("");
    await onSave({ bg_image_url: null });
    toast.success("Imagem removida");
  };

  const updateAndPreview = (field: string, value: string | null) => {
    const updates: any = {
      bg_color_1: bgColor1,
      bg_color_2: gradientEnabled && bgColor2 ? bgColor2 : null,
      bg_gradient_direction: direction,
      button_color: buttonColor,
      button_text_color: buttonTextColor,
      username_color: usernameColor,
      username_font_size: usernameFontSize,
      button_style: buttonStyle,
      button_radius: buttonRadius,
      button_padding: buttonPadding,
      button_spacing: buttonSpacing,
      button_border_color: buttonBorderColor || null,
      sub_button_style: subButtonStyle,
      sub_button_radius: subButtonRadius,
      sub_button_padding: subButtonPadding,
      sub_button_color: subButtonColor || null,
      sub_button_text_color: subButtonTextColor || null,
      content_vertical_position: verticalPosition,
      [field]: value,
    };
    handleLiveUpdate(updates);
  };

  // Preview button style computation
  const getPreviewBtnStyle = (): React.CSSProperties => {
    const radius = RADIUS_PREVIEW[buttonRadius] || "16px";
    const padding = buttonPadding === "compact" ? "8px 20px" : buttonPadding === "spacious" ? "24px 20px" : "16px 20px";
    const base: React.CSSProperties = { borderRadius: radius, padding, fontWeight: 500, width: "100%", textAlign: "center" as const };

    switch (buttonStyle) {
      case "outline":
        return { ...base, backgroundColor: "transparent", border: `2px solid ${buttonBorderColor || buttonColor}`, color: buttonBorderColor || buttonColor };
      case "soft":
        return { ...base, backgroundColor: `${buttonColor}22`, color: buttonColor };
      case "shadow":
        return { ...base, backgroundColor: buttonColor, color: buttonTextColor, boxShadow: `0 8px 24px -4px ${buttonColor}66` };
      default:
        return { ...base, backgroundColor: buttonColor, color: buttonTextColor };
    }
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

      {/* Background Image */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Imagem de Fundo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input ref={bgFileRef} type="file" accept="image/*" onChange={handleBgImageUpload} className="hidden" />
          
          {bgImageUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-border h-32">
                <img src={bgImageUrl} alt="Background" className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => bgFileRef.current?.click()} disabled={uploadingBg}>
                  <Upload className="w-4 h-4 mr-1" />
                  Trocar
                </Button>
                <Button variant="outline" size="sm" onClick={handleRemoveBgImage} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remover
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => bgFileRef.current?.click()}
              disabled={uploadingBg}
              className="w-full h-28 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors text-muted-foreground"
            >
              <Upload className="w-6 h-6" />
              <span className="text-sm">{uploadingBg ? "Enviando..." : "Enviar imagem de fundo"}</span>
            </button>
          )}
          <p className="text-xs text-muted-foreground">A imagem sobrepõe o gradiente de cores. Máximo 5MB.</p>
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

      {/* Username Style */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estilo do @Username</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="min-w-[100px]">Cor</Label>
            <input
              type="color"
              value={usernameColor}
              onChange={(e) => {
                setUsernameColor(e.target.value);
                updateAndPreview("username_color", e.target.value);
              }}
              className="w-12 h-10 rounded cursor-pointer border border-border"
            />
            <span className="text-sm text-muted-foreground font-mono">{usernameColor}</span>
          </div>

          <div>
            <Label className="mb-2 block">Tamanho</Label>
            <div className="flex gap-2">
              {FONT_SIZES.map((size) => (
                <button
                  key={size.value}
                  onClick={() => {
                    setUsernameFontSize(size.value);
                    updateAndPreview("username_font_size", size.value);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl border transition-all font-medium",
                    usernameFontSize === size.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Button Style — REDESIGNED */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estilo dos Botões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Style selector */}
          <div>
            <Label className="mb-2 block">Formato Visual</Label>
            <div className="grid grid-cols-4 gap-2">
              {BUTTON_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setButtonStyle(s.value);
                    updateAndPreview("button_style", s.value);
                  }}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-medium transition-all",
                    buttonStyle === s.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Radius selector */}
          <div>
            <Label className="mb-2 block">Arredondamento</Label>
            <div className="grid grid-cols-4 gap-2">
              {BUTTON_RADIUS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => {
                    setButtonRadius(r.value);
                    updateAndPreview("button_radius", r.value);
                  }}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-medium transition-all",
                    buttonRadius === r.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Padding selector */}
          <div>
            <Label className="mb-2 block">Altura dos Botões</Label>
            <div className="grid grid-cols-3 gap-2">
              {BUTTON_PADDING.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setButtonPadding(p.value);
                    updateAndPreview("button_padding", p.value);
                  }}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-medium transition-all",
                    buttonPadding === p.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Spacing selector */}
          <div>
            <Label className="mb-2 block">Espaçamento entre Links</Label>
            <div className="grid grid-cols-3 gap-2">
              {BUTTON_SPACING.map((sp) => (
                <button
                  key={sp.value}
                  onClick={() => {
                    setButtonSpacing(sp.value);
                    updateAndPreview("button_spacing", sp.value);
                  }}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-medium transition-all",
                    buttonSpacing === sp.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Label className="min-w-[100px]">Cor de Fundo</Label>
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
              <Label className="min-w-[100px]">Cor do Texto</Label>
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

            {buttonStyle === "outline" && (
              <div className="flex items-center gap-4">
                <Label className="min-w-[100px]">Cor da Borda</Label>
                <input
                  type="color"
                  value={buttonBorderColor || buttonColor}
                  onChange={(e) => {
                    setButtonBorderColor(e.target.value);
                    updateAndPreview("button_border_color", e.target.value);
                  }}
                  className="w-12 h-10 rounded cursor-pointer border border-border"
                />
                <span className="text-sm text-muted-foreground font-mono">{buttonBorderColor || buttonColor}</span>
              </div>
            )}
          </div>

          {/* Preview Button */}
          <div className="pt-2">
            <Label className="mb-2 block text-muted-foreground">Preview do botão:</Label>
            <div style={getPreviewBtnStyle()}>
              Exemplo de Link
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-Button Style */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estilo dos Sub-Botões</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Style selector */}
          <div>
            <Label className="mb-2 block">Formato Visual</Label>
            <div className="grid grid-cols-4 gap-2">
              {BUTTON_STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setSubButtonStyle(s.value);
                    updateAndPreview("sub_button_style", s.value);
                  }}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-medium transition-all",
                    subButtonStyle === s.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Radius selector */}
          <div>
            <Label className="mb-2 block">Arredondamento</Label>
            <div className="grid grid-cols-4 gap-2">
              {BUTTON_RADIUS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => {
                    setSubButtonRadius(r.value);
                    updateAndPreview("sub_button_radius", r.value);
                  }}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-medium transition-all",
                    subButtonRadius === r.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Padding selector */}
          <div>
            <Label className="mb-2 block">Altura</Label>
            <div className="grid grid-cols-3 gap-2">
              {BUTTON_PADDING.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setSubButtonPadding(p.value);
                    updateAndPreview("sub_button_padding", p.value);
                  }}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-medium transition-all",
                    subButtonPadding === p.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Label className="min-w-[100px]">Cor de Fundo</Label>
              <input
                type="color"
                value={subButtonColor || buttonColor}
                onChange={(e) => {
                  setSubButtonColor(e.target.value);
                  updateAndPreview("sub_button_color", e.target.value);
                }}
                className="w-12 h-10 rounded cursor-pointer border border-border"
              />
              <span className="text-sm text-muted-foreground font-mono">{subButtonColor || buttonColor}</span>
            </div>

            <div className="flex items-center gap-4">
              <Label className="min-w-[100px]">Cor do Texto</Label>
              <input
                type="color"
                value={subButtonTextColor || buttonTextColor}
                onChange={(e) => {
                  setSubButtonTextColor(e.target.value);
                  updateAndPreview("sub_button_text_color", e.target.value);
                }}
                className="w-12 h-10 rounded cursor-pointer border border-border"
              />
              <span className="text-sm text-muted-foreground font-mono">{subButtonTextColor || buttonTextColor}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Cores herdam do botão principal se não personalizadas.
          </p>
        </CardContent>
      </Card>

      {/* Save */}
      <Button onClick={handleSave} disabled={saving} className="w-full h-12 text-base">
        {saving ? "Salvando..." : "Salvar Tema"}
      </Button>
    </div>
  );
};
