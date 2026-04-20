import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  onUpload: (file: File) => Promise<unknown>;
  disabled?: boolean;
}

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB hard cap (multipart upload via edge fn)

export const DriveUploadButton = ({ onUpload, disabled }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo grande demais (máx. 25 MB)");
      return;
    }
    setBusy(true);
    try {
      await onUpload(file);
      toast.success(`"${file.name}" enviado`);
    } catch (err) {
      toast.error(`Falha no upload: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
      >
        <Upload className="h-4 w-4" />
        {busy ? "Enviando..." : "Upload"}
      </Button>
    </>
  );
};