import {
  useRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
  useLayoutEffect,
} from "react";
import { RichTextToolbar } from "./RichTextToolbar";
import { cn } from "@/lib/utils";

export interface DocumentoEditorHandle {
  insertAtCursor: (text: string) => void;
  insertPageBreak: () => void;
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
  previewHtml?: string | null;
  previewCabecalho?: string | null;
  previewRodape?: string | null;
}

// ---- Constantes A4 @ 96dpi ----
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const MIN_HEADER_H = 48;
const MIN_FOOTER_H = 48;
const MAX_HEADER_H = 240;
const MAX_FOOTER_H = 240;
const SIDE_PAD = 96;
const PAGE_GAP = 24;

// Reescala uma imagem (dataURL ou URL) para no máximo `maxWidth` px de largura
// mantendo a proporção. Retorna um novo dataURL JPEG/PNG.
async function resizeImageDataUrl(src: string, maxWidth = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (w <= maxWidth) {
          resolve(src);
          return;
        }
        const newW = maxWidth;
        const newH = Math.round((h * maxWidth) / w);
        const canvas = document.createElement("canvas");
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, newW, newH);
        // PNG preserva transparência (importante para logos)
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = src;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
    const [pageCount, setPageCount] = useState(1);
    const [headerH, setHeaderH] = useState<number>(MIN_HEADER_H);
    const [footerH, setFooterH] = useState<number>(MIN_FOOTER_H);
    const isPreview = previewHtml != null;

    // Derivados das alturas dinâmicas
    const BODY_H = PAGE_HEIGHT - headerH - footerH;
    const INTER_PAGE_BAND = footerH + PAGE_GAP + headerH;

    const refFor = (z: Zone) =>
      z === "header" ? headerRef : z === "footer" ? footerRef : bodyRef;

    const onChangeFor = (z: Zone) =>
      z === "header" ? onCabecalhoChange : z === "footer" ? onRodapeChange : onChange;

    // Cálculo de quantas páginas caberão considerando que cada página seguinte
    // adiciona uma "faixa não-imprimível" (rodapé+gap+cabeçalho) ao corpo via padding
    // dos espaçadores. A altura útil sempre é BODY_H por página.
    const recalcPages = useCallback(() => {
      const el = bodyRef.current;
      if (!el) return;
      const h = el.scrollHeight;
      // h inclui paddings reservados para faixas inter-páginas; calculamos o nº de páginas
      // de forma iterativa: cada página acomoda BODY_H, somando INTER_PAGE_BAND entre páginas
      let remaining = h;
      let pages = 1;
      remaining -= BODY_H;
      while (remaining > 0) {
        pages += 1;
        remaining -= INTER_PAGE_BAND; // espaço de faixa inter-página já contado no padding
        remaining -= BODY_H;
      }
      setPageCount((prev) => (prev !== pages ? pages : prev));
    }, [BODY_H, INTER_PAGE_BAND]);

    // Sincronizar HTML do corpo
    useEffect(() => {
      if (!bodyRef.current) return;
      const next = previewHtml != null ? previewHtml : value;
      if (next !== bodyRef.current.innerHTML) {
        isInternalChange.current = true;
        bodyRef.current.innerHTML = next;
        isInternalChange.current = false;
        requestAnimationFrame(() => recalcPages());
      }
    }, [value, previewHtml, recalcPages]);

    useEffect(() => {
      if (!headerRef.current) return;
      const next = previewCabecalho != null ? previewCabecalho : cabecalhoHtml;
      if (next !== headerRef.current.innerHTML) {
        isInternalChange.current = true;
        headerRef.current.innerHTML = next;
        isInternalChange.current = false;
        requestAnimationFrame(() => recalcPages());
      }
    }, [cabecalhoHtml, previewCabecalho, recalcPages]);

    useEffect(() => {
      if (!footerRef.current) return;
      const next = previewRodape != null ? previewRodape : rodapeHtml;
      if (next !== footerRef.current.innerHTML) {
        isInternalChange.current = true;
        footerRef.current.innerHTML = next;
        isInternalChange.current = false;
        requestAnimationFrame(() => recalcPages());
      }
    }, [rodapeHtml, previewRodape, recalcPages]);

    useLayoutEffect(() => {
      const el = bodyRef.current;
      if (!el) return;
      recalcPages();
      const ro = new ResizeObserver(() => recalcPages());
      ro.observe(el);
      return () => ro.disconnect();
    }, [recalcPages]);

    // ResizeObserver para medir altura dinâmica do cabeçalho
    useLayoutEffect(() => {
      const el = headerRef.current;
      if (!el) return;
      const measure = () => {
        const h = Math.max(MIN_HEADER_H, Math.min(MAX_HEADER_H, el.scrollHeight + 24));
        setHeaderH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    // ResizeObserver para medir altura dinâmica do rodapé
    useLayoutEffect(() => {
      const el = footerRef.current;
      if (!el) return;
      const measure = () => {
        const h = Math.max(MIN_FOOTER_H, Math.min(MAX_FOOTER_H, el.scrollHeight + 24));
        setFooterH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    const detectActiveZone = useCallback((): Zone => {
      const el = document.activeElement;
      if (el === headerRef.current) return "header";
      if (el === footerRef.current) return "footer";
      return "body";
    }, []);

    const insertPageBreakAtSelection = useCallback(() => {
      if (readOnly || isPreview) return;
      const body = bodyRef.current;
      if (!body) return;
      body.focus();
      const html =
        '<div data-page-break="true" contenteditable="false" style="break-before: page; page-break-before: always; height: 1px; margin: 0; padding: 0; border: 0;"></div><p><br></p>';
      document.execCommand("insertHTML", false, html);
      onChange(body.innerHTML);
      requestAnimationFrame(() => recalcPages());
    }, [readOnly, isPreview, onChange, recalcPages]);

    // Insere uma imagem (dataURL já reescalada) na zona ativa
    const insertImageInZone = useCallback(
      async (dataUrl: string, zone: Zone) => {
        if (readOnly || isPreview) return;
        const el = refFor(zone).current;
        if (!el) return;
        try {
          const resized = await resizeImageDataUrl(dataUrl, 600);
          el.focus();
          // Inserir <img> com style inline para garantir contenção mesmo sem CSS
          const html = `<img src="${resized}" style="max-width:100%;height:auto;display:inline-block;" alt="" />`;
          document.execCommand("insertHTML", false, html);
          const cb = onChangeFor(zone);
          cb?.(el.innerHTML);
          if (zone === "body") requestAnimationFrame(() => recalcPages());
        } catch (e) {
          console.error("Erro ao inserir imagem", e);
        }
      },
      [readOnly, isPreview, onChange, onCabecalhoChange, onRodapeChange, recalcPages]
    );

    // Abre file picker para inserir imagem
    const openImagePicker = useCallback(
      (zone: Zone) => {
        if (readOnly || isPreview) return;
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          try {
            const dataUrl = await fileToDataUrl(file);
            await insertImageInZone(dataUrl, zone);
          } catch (e) {
            console.error("Erro lendo imagem", e);
          }
        };
        input.click();
      },
      [readOnly, isPreview, insertImageInZone]
    );

    const handleFormat = useCallback(
      (command: string, val?: string) => {
        if (command === "insertPageBreak") {
          insertPageBreakAtSelection();
          return;
        }
        if (command === "insertImage") {
          // Usa zona ativa atual (não a do document.activeElement, que pode estar
          // num botão da toolbar)
          openImagePicker(activeZone);
          return;
        }
        const zone = detectActiveZone();
        document.execCommand(command, false, val);
        refFor(zone).current?.focus();
      },
      [detectActiveZone, insertPageBreakAtSelection, openImagePicker, activeZone]
    );

    const makeInputHandler = (zone: Zone) => () => {
      if (isInternalChange.current || readOnly || isPreview) return;
      const el = refFor(zone).current;
      if (!el) return;
      const cb = onChangeFor(zone);
      cb?.(el.innerHTML);
      if (zone === "body") recalcPages();
    };

    useImperativeHandle(
      ref,
      () => ({
        insertAtCursor: (text: string) => {
          let zone = detectActiveZone();
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
          if (zone === "body") recalcPages();
        },
        insertPageBreak: insertPageBreakAtSelection,
        focus: () => refFor(activeZone).current?.focus(),
      }),
      [activeZone, detectActiveZone, onChange, onCabecalhoChange, onRodapeChange, insertPageBreakAtSelection, recalcPages]
    );

    const handleKeyDown = (zone: Zone) => (e: React.KeyboardEvent) => {
      if (readOnly || isPreview) return;
      if (e.key === "Escape" && zone !== "body") {
        e.preventDefault();
        setActiveZone("body");
        bodyRef.current?.focus();
        return;
      }
      if (zone === "body" && (e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        insertPageBreakAtSelection();
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
      requestAnimationFrame(() => refFor(z).current?.focus());
    };

    // Paste: intercepta imagens (do clipboard) e reescala
    const makePasteHandler = (zone: Zone) => async (e: React.ClipboardEvent) => {
      if (readOnly || isPreview) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.type.startsWith("image/")) {
          e.preventDefault();
          const file = it.getAsFile();
          if (!file) continue;
          try {
            const dataUrl = await fileToDataUrl(file);
            await insertImageInZone(dataUrl, zone);
          } catch (err) {
            console.error("Erro ao colar imagem", err);
          }
          return;
        }
      }
    };

    // Drop: intercepta arquivos de imagem arrastados
    const makeDropHandler = (zone: Zone) => async (e: React.DragEvent) => {
      if (readOnly || isPreview) return;
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const imgFile = Array.from(files).find((f) => f.type.startsWith("image/"));
      if (!imgFile) return;
      e.preventDefault();
      try {
        const dataUrl = await fileToDataUrl(imgFile);
        await insertImageInZone(dataUrl, zone);
      } catch (err) {
        console.error("Erro ao soltar imagem", err);
      }
    };

    const preventDragOver = (e: React.DragEvent) => {
      if (readOnly || isPreview) return;
      const hasFiles = e.dataTransfer?.types?.includes("Files");
      if (hasFiles) e.preventDefault();
    };

    const zoneIsActive = (z: Zone) => activeZone === z;
    const editableNow = (z: Zone) => !readOnly && !isPreview && zoneIsActive(z);

    const totalHeight = pageCount * PAGE_HEIGHT + (pageCount - 1) * PAGE_GAP;

    const headerSourceHtml = previewCabecalho != null ? previewCabecalho : cabecalhoHtml;
    const footerSourceHtml = previewRodape != null ? previewRodape : rodapeHtml;

    return (
      <div className={cn("flex flex-col bg-muted/40 dark:bg-muted/10", className)}>
        {/* CSS escopado para conter imagens dentro das zonas */}
        <style>{`
          [data-zone="header"] img,
          [data-zone="footer"] img {
            max-width: 100% !important;
            max-height: 200px !important;
            height: auto !important;
            object-fit: contain;
            display: inline-block;
            vertical-align: middle;
          }
          [data-zone="body"] img {
            max-width: 100% !important;
            height: auto !important;
          }
        `}</style>
        {/* Toolbar sticky */}
        <div className="sticky top-0 z-30 bg-background border-b shadow-sm">
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

        {/* Mesa de trabalho com folhas A4 */}
        <div className="flex-1 overflow-auto py-8 px-4">
          <div
            className="mx-auto relative"
            style={{ width: `${PAGE_WIDTH}px`, minHeight: `${totalHeight}px` }}
          >
            {/* Camada base: editor de corpo (UM único contentEditable) */}
            <div
              className="absolute inset-x-0 top-0 z-0"
              style={{
                width: `${PAGE_WIDTH}px`,
                pointerEvents: editableNow("header") || editableNow("footer") ? "none" : "auto",
              }}
            >
              <div
                ref={bodyRef}
                data-zone="body"
                contentEditable={!readOnly && !isPreview && activeZone === "body"}
                onInput={makeInputHandler("body")}
                onKeyDown={handleKeyDown("body")}
                onPaste={makePasteHandler("body")}
                onDrop={makeDropHandler("body")}
                onDragOver={preventDragOver}
                onFocus={() => setActiveZone("body")}
                onClick={() => {
                  if (activeZone !== "body") setActiveZone("body");
                }}
                className="outline-none prose prose-sm max-w-none dark:prose-invert"
                style={{
                  fontFamily: "Times New Roman, serif",
                  fontSize: "12pt",
                  lineHeight: "1.5",
                  paddingTop: `${headerH + 12}px`,
                  paddingBottom: `${footerH + 12}px`,
                  paddingLeft: `${SIDE_PAD}px`,
                  paddingRight: `${SIDE_PAD}px`,
                  minHeight: `${PAGE_HEIGHT}px`,
                  background: "transparent",
                }}
                suppressContentEditableWarning
              />
            </div>

            {/* Camada visual: folhas A4 com cabeçalho/rodapé replicados.
                Apenas a primeira folha é interativa (header/footer editáveis);
                as demais são decoração com background opaco para mascarar
                o texto que estaria caindo na faixa do rodapé/cabeçalho. */}
            {Array.from({ length: pageCount }).map((_, i) => {
              const top = i * (PAGE_HEIGHT + PAGE_GAP);
              const isFirst = i === 0;
              const isLast = i === pageCount - 1;
              return (
                <div
                  key={`page-frame-${i}`}
                  className="absolute left-0"
                  style={{
                    top: `${top}px`,
                    width: `${PAGE_WIDTH}px`,
                    height: `${PAGE_HEIGHT}px`,
                    pointerEvents: "none",
                  }}
                >
                  {/* Sombra/borda da folha — atrás do editor */}
                  <div
                    className="absolute inset-0 bg-background shadow-xl border -z-10"
                    style={{ pointerEvents: "none" }}
                  />

                  {/* Indicador de página */}
                  <div className="absolute -top-6 right-0 text-[10px] text-muted-foreground select-none pointer-events-none">
                    Página {i + 1} de {pageCount}
                  </div>

                  {/* CABEÇALHO */}
                  <div
                    className={cn(
                      "absolute left-0 right-0 top-0 bg-background group/header transition-colors overflow-hidden",
                      isFirst && editableNow("header")
                        ? "border-b border-dashed border-primary/50"
                        : "border-b border-dashed border-transparent",
                      isFirst && !editableNow("header") && "hover:border-border"
                    )}
                    style={{
                      height: `${headerH}px`,
                      padding: `12px ${SIDE_PAD}px`,
                      pointerEvents: isFirst ? "auto" : "none",
                      zIndex: 10,
                    }}
                    onDoubleClick={isFirst ? () => activateZone("header") : undefined}
                    title={
                      isFirst && !editableNow("header")
                        ? "Duplo-clique para editar o cabeçalho"
                        : undefined
                    }
                  >
                    {isFirst && editableNow("header") && (
                      <span className="absolute -top-2 left-2 px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded">
                        Cabeçalho
                      </span>
                    )}
                    {isFirst &&
                      !editableNow("header") &&
                      !cabecalhoHtml &&
                      !previewCabecalho && (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground/50 italic opacity-0 group-hover/header:opacity-100 transition-opacity">
                          Duplo-clique para adicionar cabeçalho
                        </span>
                      )}

                    {isFirst ? (
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
                    ) : (
                      <div
                        className="text-muted-foreground/70"
                        style={{
                          fontFamily: "Times New Roman, serif",
                          fontSize: "10pt",
                          lineHeight: "1.4",
                        }}
                        dangerouslySetInnerHTML={{ __html: headerSourceHtml }}
                      />
                    )}
                  </div>

                  {/* RODAPÉ */}
                  <div
                    className={cn(
                      "absolute left-0 right-0 bottom-0 bg-background group/footer transition-colors overflow-hidden",
                      isFirst && editableNow("footer")
                        ? "border-t border-dashed border-primary/50"
                        : "border-t border-dashed border-transparent",
                      isFirst && !editableNow("footer") && "hover:border-border"
                    )}
                    style={{
                      height: `${footerH}px`,
                      padding: `12px ${SIDE_PAD}px`,
                      pointerEvents: isFirst ? "auto" : "none",
                      zIndex: 10,
                    }}
                    onDoubleClick={isFirst ? () => activateZone("footer") : undefined}
                    title={
                      isFirst && !editableNow("footer")
                        ? "Duplo-clique para editar o rodapé"
                        : undefined
                    }
                  >
                    {isFirst && editableNow("footer") && (
                      <span className="absolute -top-2 left-2 px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded">
                        Rodapé
                      </span>
                    )}
                    {isFirst &&
                      !editableNow("footer") &&
                      !rodapeHtml &&
                      !previewRodape && (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground/50 italic opacity-0 group-hover/footer:opacity-100 transition-opacity">
                          Duplo-clique para adicionar rodapé
                        </span>
                      )}

                    {isFirst ? (
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
                    ) : (
                      <div
                        className="text-muted-foreground/70"
                        style={{
                          fontFamily: "Times New Roman, serif",
                          fontSize: "10pt",
                          lineHeight: "1.4",
                        }}
                        dangerouslySetInnerHTML={{ __html: footerSourceHtml }}
                      />
                    )}
                  </div>

                  {/* Faixa do gap entre esta folha e a próxima — opaca para mascarar */}
                  {!isLast && (
                    <div
                      className="absolute left-0 right-0 bg-muted/40 dark:bg-muted/10"
                      style={{
                        top: `${PAGE_HEIGHT}px`,
                        height: `${PAGE_GAP}px`,
                        pointerEvents: "none",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);
