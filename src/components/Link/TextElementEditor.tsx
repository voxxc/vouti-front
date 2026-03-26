import { useState, useEffect } from "react";
import { LinkTextElement } from "@/types/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";

const FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Playfair Display",
  "Montserrat",
  "Open Sans",
  "Poppins",
  "Cormorant Garamond",
  "Lato",
];

interface TextElementEditorProps {
  element: Partial<LinkTextElement> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<LinkTextElement>) => void;
  onDelete?: (id: string) => void;
}

export const TextElementEditor = ({ element, open, onOpenChange, onSave, onDelete }: TextElementEditorProps) => {
  const [content, setContent] = useState("Texto");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontSize, setFontSize] = useState(16);
  const [color, setColor] = useState("#000000");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  useEffect(() => {
    if (element) {
      setContent(element.content || "Texto");
      setFontFamily(element.font_family || "Inter");
      setFontSize(element.font_size || 16);
      setColor(element.color || "#000000");
      setBold(element.font_weight === "bold");
      setItalic(element.font_style === "italic");
    } else {
      setContent("Texto");
      setFontFamily("Inter");
      setFontSize(16);
      setColor("#000000");
      setBold(false);
      setItalic(false);
    }
  }, [element, open]);

  const handleSave = () => {
    onSave({
      ...(element?.id ? { id: element.id } : {}),
      content,
      font_family: fontFamily,
      font_size: fontSize,
      color,
      font_weight: bold ? "bold" : "normal",
      font_style: italic ? "italic" : "normal",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{element?.id ? "Editar Texto" : "Novo Texto"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Digite o texto..." />
          </div>

          {/* Preview */}
          <div className="rounded-lg border p-4 bg-muted/30 flex items-center justify-center min-h-[60px]">
            <span
              style={{
                fontFamily,
                fontSize: `${Math.min(fontSize, 32)}px`,
                color,
                fontWeight: bold ? "bold" : "normal",
                fontStyle: italic ? "italic" : "normal",
              }}
            >
              {content || "Preview"}
            </span>
          </div>

          <div className="space-y-2">
            <Label>Fonte</Label>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>
                    <span style={{ fontFamily: f }}>{f}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tamanho: {fontSize}px</Label>
            <Slider min={10} max={72} step={1} value={[fontSize]} onValueChange={([v]) => setFontSize(v)} />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1 font-mono" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={bold} onCheckedChange={setBold} />
              <Label className="font-bold">Negrito</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={italic} onCheckedChange={setItalic} />
              <Label className="italic">Itálico</Label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {element?.id && onDelete && (
            <Button variant="destructive" size="sm" onClick={() => { onDelete(element.id!); onOpenChange(false); }}>
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
