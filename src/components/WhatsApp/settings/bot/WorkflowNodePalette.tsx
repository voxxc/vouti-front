import { MessageSquare, Clock, GitBranch, ArrowRightLeft, Tag, Globe, Variable } from "lucide-react";

const NODE_TYPES = [
  { type: "send_message", label: "Enviar Mensagem", icon: MessageSquare, color: "text-emerald-500", bg: "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/30" },
  { type: "wait_reply", label: "Aguardar Resposta", icon: Clock, color: "text-sky-500", bg: "bg-sky-500/10 hover:bg-sky-500/15 border-sky-500/30" },
  { type: "condition", label: "Condição", icon: GitBranch, color: "text-blue-500", bg: "bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/30" },
  { type: "transfer_agent", label: "Transferir Agente", icon: ArrowRightLeft, color: "text-orange-500", bg: "bg-orange-500/10 hover:bg-orange-500/15 border-orange-500/30" },
  { type: "add_label", label: "Etiqueta", icon: Tag, color: "text-purple-500", bg: "bg-purple-500/10 hover:bg-purple-500/15 border-purple-500/30" },
  { type: "webhook", label: "Webhook", icon: Globe, color: "text-teal-500", bg: "bg-teal-500/10 hover:bg-teal-500/15 border-teal-500/30" },
  { type: "delay", label: "Aguardar Tempo", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/30" },
  { type: "set_variable", label: "Variável", icon: Variable, color: "text-pink-500", bg: "bg-pink-500/10 hover:bg-pink-500/15 border-pink-500/30" },
];

export const WorkflowNodePalette = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="absolute left-3 top-3 z-10 bg-card/80 backdrop-blur-xl border border-border/60 rounded-2xl p-3 shadow-xl space-y-1.5 w-[180px]">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Arrastar para canvas</p>
      {NODE_TYPES.map((nt) => (
        <div
          key={nt.type}
          draggable
          onDragStart={(e) => onDragStart(e, nt.type)}
          className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border cursor-grab active:cursor-grabbing transition-all text-xs font-medium ${nt.bg}`}
        >
          <nt.icon className={`h-3.5 w-3.5 shrink-0 ${nt.color}`} />
          <span className="truncate text-foreground">{nt.label}</span>
        </div>
      ))}
    </div>
  );
};
