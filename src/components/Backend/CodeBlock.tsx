import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, language = "typescript", title, showLineNumbers = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div className="relative group">
      {title && (
        <div className="bg-muted px-4 py-2 rounded-t-lg border border-b-0 flex items-center justify-between">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{language}</span>
        </div>
      )}
      
      <div className={cn(
        "relative bg-slate-950 text-slate-50 p-4 rounded-lg border overflow-x-auto",
        title && "rounded-t-none"
      )}>
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>

        <pre className="text-sm">
          <code>
            {showLineNumbers ? (
              lines.map((line, i) => (
                <div key={i} className="table-row">
                  <span className="table-cell pr-4 text-slate-500 select-none text-right">
                    {i + 1}
                  </span>
                  <span className="table-cell">{line}</span>
                </div>
              ))
            ) : (
              code
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}
