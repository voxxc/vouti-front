import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditableColumnNameProps {
  columnName: string;
  onUpdateName: (newName: string) => void;
  isDefault?: boolean;
}

const EditableColumnName = ({ columnName, onUpdateName, isDefault }: EditableColumnNameProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(columnName);

  const handleSave = () => {
    if (editedName.trim() && editedName !== columnName) {
      onUpdateName(editedName.trim());
    } else {
      setEditedName(columnName);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(columnName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 text-sm font-semibold"
          autoFocus
          onBlur={handleSave}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleSave}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCancel}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <span className="text-sm font-semibold">{columnName}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default EditableColumnName;
