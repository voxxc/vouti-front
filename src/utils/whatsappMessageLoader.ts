import { supabase } from "@/integrations/supabase/client";
import { normalizePhone, getPhoneVariant } from "@/utils/phoneUtils";

interface WhatsAppMessageRaw {
  id: string;
  message_text: string | null;
  direction: string;
  created_at: string;
  message_type: string | null;
  raw_data: any;
}

export interface FormattedMessage {
  id: string;
  messageText: string;
  direction: "incoming" | "outgoing";
  timestamp: string;
  isFromMe: boolean;
  messageType: "text" | "image" | "audio" | "video" | "document";
  mediaUrl?: string;
}

function formatMessage(msg: WhatsAppMessageRaw): FormattedMessage {
  const rawData = msg.raw_data as any;
  return {
    id: msg.id,
    messageText: msg.message_text || "",
    direction: msg.direction === "outgoing" ? "outgoing" : "incoming",
    timestamp: msg.created_at,
    isFromMe: msg.direction === "outgoing",
    messageType: (msg.message_type as FormattedMessage['messageType']) || "text",
    mediaUrl: rawData?.image?.imageUrl || rawData?.audio?.audioUrl || rawData?.video?.videoUrl || rawData?.document?.documentUrl || undefined,
  };
}

const PAGE_SIZE = 1000;
const LATEST_PAGE_SIZE = 200;

interface LoadMessagesOptions {
  contactNumber: string;
  tenantId?: string | null;
  agentId?: string | null;
  /** If true, filters tenant_id IS NULL (super admin mode) */
  tenantIsNull?: boolean;
  /** If true, skips agent_id filter even when agentId is set */
  skipAgentFilter?: boolean;
}

/**
 * Loads the latest N messages (default 200) for a conversation.
 * Returns them in ascending order (oldest first) for display.
 * Also returns hasMore flag indicating if older messages exist.
 */
export async function loadLatestMessages(
  options: LoadMessagesOptions & { limit?: number; beforeDate?: string }
): Promise<{ messages: FormattedMessage[]; hasMore: boolean }> {
  const { contactNumber, tenantId, agentId, tenantIsNull, skipAgentFilter, limit = LATEST_PAGE_SIZE, beforeDate } = options;
  const normalized = normalizePhone(contactNumber);
  const variant = getPhoneVariant(normalized);

  let query = supabase
    .from("whatsapp_messages")
    .select("id, message_text, direction, created_at, message_type, raw_data")
    .order("created_at", { ascending: false })
    .limit(limit + 1); // fetch one extra to detect hasMore

  // Phone filter
  if (variant) {
    query = query.or(`from_number.eq.${normalized},from_number.eq.${variant}`);
  } else {
    query = query.eq("from_number", normalized);
  }

  // Before date filter (for pagination)
  if (beforeDate) {
    query = query.lt("created_at", beforeDate);
  }

  // Tenant filter
  if (tenantIsNull) {
    query = query.is("tenant_id", null);
  } else if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  // Agent filter
  if (agentId && !skipAgentFilter) {
    query = query.eq("agent_id", agentId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []) as WhatsAppMessageRaw[];
  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;

  // Reverse to ascending order for display
  return {
    messages: trimmed.reverse().map(formatMessage),
    hasMore,
  };
}

/**
 * Loads ALL messages for a conversation using pagination to bypass 
 * Supabase's default 1000-row limit.
 */
export async function loadAllMessages(options: LoadMessagesOptions): Promise<FormattedMessage[]> {
  const { contactNumber, tenantId, agentId, tenantIsNull, skipAgentFilter } = options;
  const normalized = normalizePhone(contactNumber);
  const variant = getPhoneVariant(normalized);

  let allMessages: WhatsAppMessageRaw[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from("whatsapp_messages")
      .select("id, message_text, direction, created_at, message_type, raw_data")
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    // Phone filter
    if (variant) {
      query = query.or(`from_number.eq.${normalized},from_number.eq.${variant}`);
    } else {
      query = query.eq("from_number", normalized);
    }

    // Tenant filter
    if (tenantIsNull) {
      query = query.is("tenant_id", null);
    } else if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    // Agent filter
    if (agentId && !skipAgentFilter) {
      query = query.eq("agent_id", agentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const page = (data || []) as WhatsAppMessageRaw[];
    allMessages = allMessages.concat(page);

    hasMore = page.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  return allMessages.map(formatMessage);
}
