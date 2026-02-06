import { useRef, useCallback, useEffect } from "react";
import { RichTextToolbar } from "./RichTextToolbar";
import { cn } from "@/lib/utils";

interface DocumentoEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function DocumentoEditor({ value, onChange, className }: DocumentoEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Sincronizar valor inicial
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      isInternalChange.current = true;
      editorRef.current.innerHTML = value;
      isInternalChange.current = false;
    }
  }, [value]);

  const handleFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const handleInput = useCallback(() => {
    if (!isInternalChange.current && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Atalhos de teclado
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
  }, [handleFormat]);

  return (
    <div className={cn("flex flex-col border rounded-lg overflow-hidden bg-background", className)}>
      <RichTextToolbar onFormat={handleFormat} />
      
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="flex-1 min-h-[400px] p-6 outline-none overflow-auto prose prose-sm max-w-none dark:prose-invert"
        style={{
          fontFamily: "Times New Roman, serif",
          fontSize: "14px",
          lineHeight: "1.6",
        }}
        suppressContentEditableWarning
      />
    </div>
  );
}
