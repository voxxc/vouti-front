import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface PartesInputProps {
  parteAtiva: string;
  partePassiva: string;
  onChangeAtiva: (value: string) => void;
  onChangePassiva: (value: string) => void;
  errorsAtiva?: string;
  errorsPassiva?: string;
}

const PartesInput = ({
  parteAtiva,
  partePassiva,
  onChangeAtiva,
  onChangePassiva,
  errorsAtiva,
  errorsPassiva
}: PartesInputProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="parte_ativa">
          Parte Ativa <span className="text-destructive">*</span>
        </Label>
        <Input
          id="parte_ativa"
          placeholder="Nome da parte ativa"
          value={parteAtiva || ''}
          onChange={(e) => onChangeAtiva(e.target.value)}
          maxLength={500}
        />
        {errorsAtiva && (
          <p className="text-sm text-destructive mt-1">{errorsAtiva}</p>
        )}
      </div>

      <div>
        <Label htmlFor="parte_passiva">
          Parte Passiva <span className="text-destructive">*</span>
        </Label>
        <Input
          id="parte_passiva"
          placeholder="Nome da parte passiva"
          value={partePassiva || ''}
          onChange={(e) => onChangePassiva(e.target.value)}
          maxLength={500}
        />
        {errorsPassiva && (
          <p className="text-sm text-destructive mt-1">{errorsPassiva}</p>
        )}
      </div>
    </div>
  );
};

export default PartesInput;
