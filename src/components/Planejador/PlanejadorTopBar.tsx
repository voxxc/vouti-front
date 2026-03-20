import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, LayoutGrid } from "lucide-react";

interface PlanejadorTopBarProps {
  onCreateTask: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: 'prazo', label: 'Prazo' },
  { id: 'lista', label: 'Lista' },
  { id: 'calendario', label: 'Calendário' },
];

export function PlanejadorTopBar({ onCreateTask, searchQuery, onSearchChange, activeTab, onTabChange }: PlanejadorTopBarProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-6 w-6 text-white" />
            <h1 className="text-xl font-bold text-white tracking-tight">Planejador</h1>
          </div>
          <Button
            onClick={onCreateTask}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 h-9 rounded-lg shadow-lg shadow-emerald-500/20"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Criar
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Pesquisar tarefa..."
              className="pl-9 h-9 w-64 bg-white/10 border-white/10 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-white/20"
            />
          </div>
        </div>
      </div>

      {/* Tabs row */}
      <div className="flex items-center gap-1 border-b border-white/10 pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
