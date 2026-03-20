import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { GripVertical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanColumn, KANBAN_COLUMNS } from "@/hooks/usePlanejadorTasks";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export interface ColumnConfig {
  id: KanbanColumn;
  label: string;
  color: string;
  visible: boolean;
  order: number;
}

interface PlanejadorSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnConfig: ColumnConfig[];
  onColumnConfigChange: (config: ColumnConfig[]) => void;
}

export function PlanejadorSettings({ open, onOpenChange, columnConfig, onColumnConfigChange }: PlanejadorSettingsProps) {
  const sorted = [...columnConfig].sort((a, b) => a.order - b.order);

  const handleLabelChange = (id: KanbanColumn, label: string) => {
    onColumnConfigChange(
      columnConfig.map(c => c.id === id ? { ...c, label } : c)
    );
  };

  const handleVisibilityToggle = (id: KanbanColumn) => {
    onColumnConfigChange(
      columnConfig.map(c => c.id === id ? { ...c, visible: !c.visible } : c)
    );
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = [...sorted];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    onColumnConfigChange(items.map((item, i) => ({ ...item, order: i })));
  };

  const handleReset = () => {
    onColumnConfigChange(
      KANBAN_COLUMNS.map((col, i) => ({
        id: col.id,
        label: col.label,
        color: col.color,
        visible: true,
        order: i,
      }))
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:max-w-[380px] bg-zinc-900 border-zinc-800">
        <SheetHeader>
          <SheetTitle className="text-white">Configurações das Colunas</SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-2">
          <p className="text-xs text-zinc-500 mb-2">Arraste para reordenar. Edite os nomes e ative/desative colunas.</p>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="column-settings">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                  {sorted.map((col, index) => (
                    <Draggable key={col.id} draggableId={col.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                            snapshot.isDragging ? 'bg-zinc-700' : 'bg-zinc-800/50 hover:bg-zinc-800'
                          }`}
                        >
                          <div {...provided.dragHandleProps} className="cursor-grab">
                            <GripVertical className="h-4 w-4 text-zinc-500" />
                          </div>
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: col.color }}
                          />
                          <Input
                            value={col.label}
                            onChange={(e) => handleLabelChange(col.id, e.target.value)}
                            className="h-8 text-sm bg-transparent border-zinc-700 text-white flex-1"
                          />
                          <Switch
                            checked={col.visible}
                            onCheckedChange={() => handleVisibilityToggle(col.id)}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <Button
            variant="ghost"
            onClick={handleReset}
            className="mt-4 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar padrão
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
