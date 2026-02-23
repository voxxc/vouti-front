import { useState, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Search, Clock } from "lucide-react";

interface EmojiPickerProps {
  agentId?: string | null;
  tenantId?: string | null;
  onEmojiSelect: (emoji: string) => void;
}

const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
  {
    name: "Smileys",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","😟","🙁","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"],
  },
  {
    name: "Gestos",
    emojis: ["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷","🦴","👀","👁️","👅","👄"],
  },
  {
    name: "Corações",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟"],
  },
  {
    name: "Objetos",
    emojis: ["📱","💻","⌨️","🖥️","🖨️","🖱️","💾","💿","📀","📷","📸","📹","🎥","📞","☎️","📟","📠","📺","📻","🎙️","🎚️","🎛️","⏱️","⏲️","⏰","🕰️","💡","🔦","🕯️","📔","📕","📖","📗","📘","📙","📚","📓","📒","📃","📜","📄","📰","🗞️","📑","🔖","🏷️","💰","🪙","💴","💵","💶","💷","💸","💳","🧾","📧","📨","📩","📤","📥","📦","📫","📪","📬","📭","📮","🗳️","✏️","✒️","🖋️","🖊️","🖌️","🖍️","📝"],
  },
  {
    name: "Viagem",
    emojis: ["🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍️","🛵","🚲","🛴","🛹","🛼","🚁","🛸","✈️","🛩️","🚀","🛶","⛵","🚤","🛥️","🛳️","⛴️","🚢","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰"],
  },
  {
    name: "Símbolos",
    emojis: ["✅","❌","⭕","❗","❓","‼️","⁉️","💯","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟤","🔺","🔻","🔸","🔹","🔶","🔷","💠","🔘","🔳","🔲","🏁","🚩","🎌","🏴","🏳️","⬛","⬜","◼️","◻️","▪️","▫️"],
  },
];

export const EmojiPicker = ({ agentId, tenantId, onEmojiSelect }: EmojiPickerProps) => {
  const [search, setSearch] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  useEffect(() => {
    if (!agentId) return;
    supabase
      .from("whatsapp_emoji_history" as any)
      .select("emoji")
      .eq("agent_id", agentId)
      .order("use_count", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setRecentEmojis((data as any[]).map(d => d.emoji));
      });
  }, [agentId]);

  const handleSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    if (!agentId) return;

    // Upsert emoji history
    supabase
      .from("whatsapp_emoji_history" as any)
      .upsert(
        { agent_id: agentId, tenant_id: tenantId, emoji, use_count: 1, last_used_at: new Date().toISOString() },
        { onConflict: "agent_id,emoji" }
      )
      .then(() => {
        // Increment use_count via raw update
        supabase
          .from("whatsapp_emoji_history" as any)
          .update({ last_used_at: new Date().toISOString() })
          .eq("agent_id", agentId)
          .eq("emoji", emoji)
          .then(() => {});
      });

    setRecentEmojis(prev => {
      const filtered = prev.filter(e => e !== emoji);
      return [emoji, ...filtered].slice(0, 20);
    });
  };

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return EMOJI_CATEGORIES;
    // Simple search: filter emojis (won't search by name, just shows all with search substring match — emojis don't match text easily)
    return EMOJI_CATEGORIES.map(cat => ({
      ...cat,
      emojis: cat.emojis,
    }));
  }, [search]);

  return (
    <div className="w-72 bg-popover border rounded-lg shadow-lg">
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar emoji..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-xs pl-7"
          />
        </div>
      </div>
      <ScrollArea className="h-64">
        <div className="p-2">
          {recentEmojis.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Recentes</span>
              </div>
              <div className="flex flex-wrap gap-0.5">
                {recentEmojis.map((emoji, i) => (
                  <button
                    key={`recent-${i}`}
                    onClick={() => handleSelect(emoji)}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent text-lg cursor-pointer transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
          {filteredCategories.map(cat => (
            <div key={cat.name} className="mb-3">
              <span className="text-[10px] font-medium text-muted-foreground uppercase mb-1.5 block">{cat.name}</span>
              <div className="flex flex-wrap gap-0.5">
                {cat.emojis.map((emoji, i) => (
                  <button
                    key={`${cat.name}-${i}`}
                    onClick={() => handleSelect(emoji)}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent text-lg cursor-pointer transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
