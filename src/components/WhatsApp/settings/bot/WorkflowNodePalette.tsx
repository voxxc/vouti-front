import { MessageSquare, Clock, GitBranch, ArrowRightLeft, Tag, Globe, Variable } from "lucide-react";

const NODE_TYPES = [
  { type: "send_message", label: "Enviar Mensagem", icon: MessageSquare, color: "border-emerald-500/40 hover:border-emerald-500" },
  { type: "wait_reply", label: "Aguardar Resposta", icon: Clock, color: "border-sky-500/40 hover:border-sky-500" },
  { type: "condition", label: "Condição", icon: GitBranch, color: "border-blue-500/40 hover:border-blue-500" },
  { type: "transfer_agent", label: "Transferir Agente", icon: ArrowRightLeft, color: "border-orange-500/40 hover:border-orange-500" },
  { type: "add_label", label: "Etiqueta", icon: Tag, color: "border-purple-500/40 hover:border-purple-500" },
  { type: "webhook", label: "Webhook", icon: Globe, color: "border-teal-500/40 hover:border-teal-500" },
  { type: "delay", label: "Aguardar Tempo", icon: Clock, color: "border-amber-500/40 hover:border-amber-500" },
  { type: "set_variable", label: "Variável", icon: Variable, color: "border-pink-500/40 hover:border-pink-500" },
];

export const WorkflowNodePalette = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="absolute left-3 top-3 z-10 bg-background/90 backdrop-blur-md border rounded-xl p-3 shadow-xl space-y-1.5 w-[170px]">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Arrastar para canvas</p>
      {NODE_TYPES.map((nt) => (
        <div
          key={nt.type}
          draggable
          onDragStart={(e) => onDragStart(e, nt.type)}
          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-colors text-xs font-medium ${nt.color} bg-background hover:bg-muted/50`}
        >
          <nt.icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{nt.label}</span>
        </div>
      ))}
    </div>
  );
};
