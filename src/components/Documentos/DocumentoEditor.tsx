import { useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from "react";
import { RichTextToolbar } from "./RichTextToolbar";
import { cn } from "@/lib/utils";

export interface DocumentoEditorHandle {
  insertAtCursor: (text: string) => void;
  focus: () => void;
}

interface DocumentoEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  readOnly?: boolean;
  /** Quando true, renderiza HTML com variáveis já substituídas (modo preview). */
  previewHtml?: string | null;
}

export const DocumentoEditor = forwardRef<DocumentoEditorHandle, DocumentoEditorProps>(
  function DocumentoEditor({ value, onChange, className, readOnly, previewHtml }, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Sincronizar valor inicial / preview
  useEffect(() => {
    if (!editorRef.current) return;
    const next = previewHtml != null ? previewHtml : value;
    if (next !== editorRef.current.innerHTML) {
      isInternalChange.current = true;
      editorRef.current.innerHTML = next;
      isInternalChange.current = false;
    }
  }, [value, previewHtml]);

  const handleFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const handleInput = useCallback(() => {
    if (!isInternalChange.current && editorRef.current && !readOnly && previewHtml == null) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange, readOnly, previewHtml]);

  useImperativeHandle(ref, () => ({
    insertAtCursor: (text: string) => {
      if (!editorRef.current) return;
      editorRef.current.focus();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !editorRef.current.contains(sel.anchorNode)) {
        // append ao fim
        document.execCommand("insertText", false, text);
      } else {
        document.execCommand("insertText", false, text);
      }
      onChange(editorRef.current.innerHTML);
    },
    focus: () => editorRef.current?.focus(),
  }), [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (readOnly || previewHtml != null) return;
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
  }, [handleFormat, readOnly, previewHtml]);

  return (
    <div className={cn("flex flex-col bg-muted/40 dark:bg-muted/10", className)}>
      {/* Toolbar sticky */}
      <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
        <RichTextToolbar onFormat={handleFormat} />
        {previewHtml != null && (
          <div className="px-4 py-1.5 text-xs bg-amber-50 text-amber-900 border-t border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900">
            Modo Preview — variáveis substituídas pelos dados do cliente. Edição desabilitada.
          </div>
        )}
      </div>

      {/* Mesa de trabalho com folha A4 */}
      <div className="flex-1 overflow-auto py-8 px-4">
        <div
          className="mx-auto bg-background shadow-xl border"
          style={{
            width: "794px",
            minHeight: "1123px",
            padding: "96px",
          }}
        >
          <div
            ref={editorRef}
            contentEditable={!readOnly && previewHtml == null}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            className="outline-none prose prose-sm max-w-none dark:prose-invert"
            style={{
              fontFamily: "Times New Roman, serif",
              fontSize: "12pt",
              lineHeight: "1.5",
              minHeight: "931px", // 1123 - 2*96
            }}
            suppressContentEditableWarning
          />
        </div>
      </div>
    </div>
  );
});
