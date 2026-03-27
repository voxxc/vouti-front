import { useCallback, useRef, useMemo, useState } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { WorkflowStep } from "@/hooks/useWhatsAppBotWorkflows";

import { TriggerNode } from "./nodes/TriggerNode";
import { SendMessageNode } from "./nodes/SendMessageNode";
import { WaitReplyNode } from "./nodes/WaitReplyNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { TransferNode } from "./nodes/TransferNode";
import { LabelNode } from "./nodes/LabelNode";
import { WebhookNode } from "./nodes/WebhookNode";
import { DelayNode } from "./nodes/DelayNode";
import { VariableNode } from "./nodes/VariableNode";
import { WorkflowNodePalette } from "./WorkflowNodePalette";

const nodeTypes = {
  trigger: TriggerNode,
  send_message: SendMessageNode,
  wait_reply: WaitReplyNode,
  condition: ConditionNode,
  transfer_agent: TransferNode,
  add_label: LabelNode,
  webhook: WebhookNode,
  delay: DelayNode,
  set_variable: VariableNode,
};

interface WorkflowCanvasProps {
  workflowId: string;
  triggerType: string;
  triggerValue: string | null;
  steps: WorkflowStep[];
  onSave: (steps: Omit<WorkflowStep, "id" | "created_at">[]) => Promise<void>;
}

function stepsToNodesAndEdges(
  steps: WorkflowStep[],
  triggerType: string,
  triggerValue: string | null
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [
    {
      id: "trigger",
      type: "trigger",
      position: { x: 300, y: 30 },
      data: { trigger_type: triggerType, trigger_value: triggerValue },
      deletable: false,
    },
  ];
  const edges: Edge[] = [];

  steps.forEach((step, i) => {
    const { _x, _y, _connections, ...config } = step.config as any;
    const nodeId = step.id || `step-${i}`;
    nodes.push({
      id: nodeId,
      type: step.step_type,
      position: { x: _x ?? 300, y: _y ?? 150 + i * 150 },
      data: { ...config, _stepId: step.id },
    });

    if (_connections && Array.isArray(_connections)) {
      _connections.forEach((conn: any) => {
        edges.push({
          id: `e-${nodeId}-${conn.target}`,
          source: nodeId,
          target: conn.target,
          sourceHandle: conn.sourceHandle || undefined,
          animated: true,
          style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
        });
      });
    } else if (i === 0) {
      edges.push({
        id: `e-trigger-${nodeId}`,
        source: "trigger",
        target: nodeId,
        animated: true,
        style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
      });
    }
  });

  // If steps exist but first step has no connections from trigger, add default
  if (steps.length > 0 && !edges.some((e) => e.source === "trigger")) {
    const firstId = steps[0].id || "step-0";
    edges.push({
      id: `e-trigger-${firstId}`,
      source: "trigger",
      target: firstId,
      animated: true,
      style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
    });
  }

  return { nodes, edges };
}

function nodesToSteps(
  nodes: Node[],
  edges: Edge[],
  workflowId: string
): Omit<WorkflowStep, "id" | "created_at">[] {
  return nodes
    .filter((n) => n.type !== "trigger")
    .map((n, i) => {
      const { _stepId, ...config } = n.data as any;
      const outEdges = edges.filter((e) => e.source === n.id);
      const connections = outEdges.map((e) => ({
        target: e.target,
        sourceHandle: e.sourceHandle || null,
      }));

      return {
        workflow_id: workflowId,
        step_type: n.type!,
        step_order: i,
        config: { ...config, _x: n.position.x, _y: n.position.y, _connections: connections },
      };
    });
}

const CanvasInner = ({ workflowId, triggerType, triggerValue, steps, onSave }: WorkflowCanvasProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const initial = useMemo(() => stepsToNodesAndEdges(steps, triggerType, triggerValue), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge({ ...connection, animated: true, style: { stroke: "hsl(var(--primary))", strokeWidth: 2 } }, eds)
      );
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 110,
        y: event.clientY - bounds.top - 30,
      };

      const newNode: Node = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: {},
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const stepsData = nodesToSteps(nodes, edges, workflowId);
      await onSave(stepsData);
      toast.success("Workflow salvo!");
    } catch {
      toast.error("Erro ao salvar workflow");
    }
    setSaving(false);
  };

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        className="bg-[#1a1a2e]"
        defaultEdgeOptions={{ animated: true, style: { stroke: "hsl(var(--primary))", strokeWidth: 2 } }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333355" />
        <Controls className="!bg-background/80 !border !rounded-lg !shadow-lg [&>button]:!bg-background [&>button]:!border-border [&>button]:!text-foreground" />
        <MiniMap
          className="!bg-background/80 !border !rounded-lg !shadow-lg"
          nodeColor="#6366f1"
          maskColor="rgba(0,0,0,0.4)"
        />
      </ReactFlow>
      <WorkflowNodePalette />
      <div className="absolute top-3 right-3 z-10">
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5 shadow-lg">
          <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
};

export const WorkflowCanvas = (props: WorkflowCanvasProps) => (
  <ReactFlowProvider>
    <CanvasInner {...props} />
  </ReactFlowProvider>
);
