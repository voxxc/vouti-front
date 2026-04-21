import { useRef, useCallback, useEffect, useImperativeHandle, forwardRef, useState } from "react";
import { RichTextToolbar } from "./RichTextToolbar";
import { cn } from "@/lib/utils";

export interface DocumentoEditorHandle {
  insertAtCursor: (text: string) => void;
  focus: () => void;
}

type Zone = "header" | "body" | "footer";

interface DocumentoEditorProps {
  value: string;
  onChange: (value: string) => void;
  cabecalhoHtml?: string;
  onCabecalhoChange?: (value: string) => void;
  rodapeHtml?: string;
  onRodapeChange?: (value: string) => void;
  className?: string;
  readOnly?: boolean;
  /** Quando true, renderiza HTML com variáveis já substituídas (modo preview). */
  previewHtml?: string | null;
  previewCabecalho?: string | null;
  previewRodape?: string | null;
}

export const DocumentoEditor = forwardRef<DocumentoEditorHandle, DocumentoEditorProps>(
  function DocumentoEditor(
    {
      value,
      onChange,
      cabecalhoHtml = "",
      onCabecalhoChange,
      rodapeHtml = "",
      onRodapeChange,
      className,
      readOnly,
      previewHtml,
      previewCabecalho,
      previewRodape,
    },
    ref
  ) {
    const headerRef = useRef<HTMLDivElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    const isInternalChange = useRef(false);
    const [activeZone, setActiveZone] = useState<Zone>("body");
    const isPreview = previewHtml != null;

    const refFor = (z: Zone) =>
      z === "header" ? headerRef : z === "footer" ? footerRef : bodyRef;

    const onChangeFor = (z: Zone) =>
      z === "header" ? onCabecalhoChange : z === "footer" ? onRodapeChange : onChange;

    // Sincronizar HTML em cada zona (corpo)
    useEffect(() => {
      if (!bodyRef.current) return;
      const next = previewHtml != null ? previewHtml : value;
      if (next !== bodyRef.current.innerHTML) {
        isInternalChange.current = true;
        bodyRef.current.innerHTML = next;
        isInternalChange.current = false;
      }
    }, [value, previewHtml]);

    // Sincronizar cabeçalho
    useEffect(() => {
      if (!headerRef.current) return;
      const next = previewCabecalho != null ? previewCabecalho : cabecalhoHtml;
      if (next !== headerRef.current.innerHTML) {
        isInternalChange.current = true;
        headerRef.current.innerHTML = next;
        isInternalChange.current = false;
      }
    }, [cabecalhoHtml, previewCabecalho]);

    // Sincronizar rodapé
    useEffect(() => {
      if (!footerRef.current) return;
      const next = previewRodape != null ? previewRodape : rodapeHtml;
      if (next !== footerRef.current.innerHTML) {
        isInternalChange.current = true;
        footerRef.current.innerHTML = next;
        isInternalChange.current = false;
      }
    }, [rodapeHtml, previewRodape]);

    const detectActiveZone = useCallback((): Zone => {
      const el = document.activeElement;
      if (el === headerRef.current) return "header";
      if (el === footerRef.current) return "footer";
      return "body";
    }, []);

    const handleFormat = useCallback(
      (command: string, val?: string) => {
        const zone = detectActiveZone();
        document.execCommand(command, false, val);
        refFor(zone).current?.focus();
      },
      [detectActiveZone]
    );

    const makeInputHandler = (zone: Zone) => () => {
      if (isInternalChange.current || readOnly || isPreview) return;
      const el = refFor(zone).current;
      if (!el) return;
      const cb = onChangeFor(zone);
      cb?.(el.innerHTML);
    };

    useImperativeHandle(
      ref,
      () => ({
        insertAtCursor: (text: string) => {
          let zone = detectActiveZone();
          // Se nenhuma zona editável tem foco, usar a zona ativa marcada
          if (
            document.activeElement !== headerRef.current &&
            document.activeElement !== bodyRef.current &&
            document.activeElement !== footerRef.current
          ) {
            zone = activeZone;
          }
          const el = refFor(zone).current;
          if (!el) return;
          el.focus();
          document.execCommand("insertText", false, text);
          const cb = onChangeFor(zone);
          cb?.(el.innerHTML);
        },
        focus: () => refFor(activeZone).current?.focus(),
      }),
      [activeZone, detectActiveZone, onChange, onCabecalhoChange, onRodapeChange]
    );

    const handleKeyDown = (zone: Zone) => (e: React.KeyboardEvent) => {
      if (readOnly || isPreview) return;
      if (e.key === "Escape" && zone !== "body") {
        e.preventDefault();
        setActiveZone("body");
        bodyRef.current?.focus();
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            handleFormat("bold");
            break;
          case "i":
            e.preventDefault();
            handleFormat("italic");
            break;
          case "u":
            e.preventDefault();
            handleFormat("underline");
            break;
          case "z":
            e.preventDefault();
            handleFormat(e.shiftKey ? "redo" : "undo");
            break;
          case "y":
            e.preventDefault();
            handleFormat("redo");
            break;
        }
      }
    };

    const activateZone = (z: Zone) => {
      if (readOnly || isPreview) return;
      setActiveZone(z);
      // foco na próxima tick para garantir contentEditable já aplicado
      requestAnimationFrame(() => refFor(z).current?.focus());
    };

    const HEADER_HEIGHT = 60;
    const FOOTER_HEIGHT = 60;
    const SIDE_PADDING = 96;

    const zoneIsActive = (z: Zone) => activeZone === z;
    const editableNow = (z: Zone) => !readOnly && !isPreview && zoneIsActive(z);

    return (
      <div className={cn("flex flex-col bg-muted/40 dark:bg-muted/10", className)}>
        {/* Toolbar sticky */}
        <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
          <RichTextToolbar onFormat={handleFormat} />
          {isPreview && (
            <div className="px-4 py-1.5 text-xs bg-muted text-muted-foreground border-t">
              Modo Preview — variáveis substituídas pelos dados do cliente. Edição desabilitada.
            </div>
          )}
          {!isPreview && activeZone !== "body" && (
            <div className="px-4 py-1.5 text-xs bg-primary/5 text-primary border-t flex items-center justify-between">
              <span>
                Editando {activeZone === "header" ? "cabeçalho" : "rodapé"} — clique no
                corpo ou pressione Esc para voltar.
              </span>
              <button
                onClick={() => activateZone("body")}
                className="text-[11px] underline hover:no-underline"
              >
                Voltar ao corpo
              </button>
            </div>
          )}
        </div>

        {/* Mesa de trabalho com folha A4 */}
        <div className="flex-1 overflow-auto py-8 px-4">
          <div
            className="mx-auto bg-background shadow-xl border relative flex flex-col"
            style={{ width: "794px", minHeight: "1123px" }}
          >
            {/* CABEÇALHO */}
            <div
              className={cn(
                "relative group/header transition-colors",
                editableNow("header")
                  ? "border-b border-dashed border-primary/50"
                  : "border-b border-dashed border-transparent hover:border-border"
              )}
              style={{
                minHeight: `${HEADER_HEIGHT}px`,
                padding: `12px ${SIDE_PADDING}px`,
              }}
              onDoubleClick={() => activateZone("header")}
              title={editableNow("header") ? undefined : "Duplo-clique para editar o cabeçalho"}
            >
              {editableNow("header") && (
                <span className="absolute -top-2 left-2 px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded">
                  Cabeçalho
                </span>
              )}
              {!editableNow("header") && !cabecalhoHtml && !previewCabecalho && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground/50 italic opacity-0 group-hover/header:opacity-100 transition-opacity">
                  Duplo-clique para adicionar cabeçalho
                </span>
              )}
              <div
                ref={headerRef}
                contentEditable={editableNow("header")}
                suppressContentEditableWarning
                onInput={makeInputHandler("header")}
                onKeyDown={handleKeyDown("header")}
                className={cn(
                  "outline-none min-h-[36px]",
                  !editableNow("header") && "text-muted-foreground/70 cursor-default"
                )}
                style={{
                  fontFamily: "Times New Roman, serif",
                  fontSize: "10pt",
                  lineHeight: "1.4",
                }}
              />
            </div>

            {/* CORPO */}
            <div
              className="flex-1"
              style={{ padding: `24px ${SIDE_PADDING}px` }}
              onClick={() => {
                if (activeZone !== "body") activateZone("body");
              }}
            >
              <div
                ref={bodyRef}
                contentEditable={!readOnly && !isPreview}
                onInput={makeInputHandler("body")}
                onKeyDown={handleKeyDown("body")}
                onFocus={() => setActiveZone("body")}
                className="outline-none prose prose-sm max-w-none dark:prose-invert"
                style={{
                  fontFamily: "Times New Roman, serif",
                  fontSize: "12pt",
                  lineHeight: "1.5",
                  minHeight: `${1123 - HEADER_HEIGHT - FOOTER_HEIGHT - 48}px`,
                }}
                suppressContentEditableWarning
              />
            </div>

            {/* RODAPÉ */}
            <div
              className={cn(
                "relative group/footer transition-colors mt-auto",
                editableNow("footer")
                  ? "border-t border-dashed border-primary/50"
                  : "border-t border-dashed border-transparent hover:border-border"
              )}
              style={{
                minHeight: `${FOOTER_HEIGHT}px`,
                padding: `12px ${SIDE_PADDING}px`,
              }}
              onDoubleClick={() => activateZone("footer")}
              title={editableNow("footer") ? undefined : "Duplo-clique para editar o rodapé"}
            >
              {editableNow("footer") && (
                <span className="absolute -top-2 left-2 px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded">
                  Rodapé
                </span>
              )}
              {!editableNow("footer") && !rodapeHtml && !previewRodape && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground/50 italic opacity-0 group-hover/footer:opacity-100 transition-opacity">
                  Duplo-clique para adicionar rodapé
                </span>
              )}
              <div
                ref={footerRef}
                contentEditable={editableNow("footer")}
                suppressContentEditableWarning
                onInput={makeInputHandler("footer")}
                onKeyDown={handleKeyDown("footer")}
                className={cn(
                  "outline-none min-h-[36px]",
                  !editableNow("footer") && "text-muted-foreground/70 cursor-default"
                )}
                style={{
                  fontFamily: "Times New Roman, serif",
                  fontSize: "10pt",
                  lineHeight: "1.4",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
);
