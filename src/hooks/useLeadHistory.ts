import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Json } from "@/integrations/supabase/types";

export interface HistoryEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

interface AddHistoryParams {
  leadId: string;
  action: string;
  details: string;
  currentHistory?: HistoryEntry[];
}

const MAX_HISTORY_ENTRIES = 200;

// Convert HistoryEntry[] to Json for Supabase
const toJson = (history: HistoryEntry[]): Json => {
  return history as unknown as Json;
};

export function useLeadHistory() {
  const { user } = useAuth();

  const addHistoryEntry = async ({
    leadId,
    action,
    details,
    currentHistory = [],
  }: AddHistoryParams): Promise<HistoryEntry[] | null> => {
    const newEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user: user?.email ?? "Usuário",
      action,
      details,
    };

    // Push new entry and keep only the most recent MAX_HISTORY_ENTRIES
    let updatedHistory = [newEntry, ...currentHistory];
    if (updatedHistory.length > MAX_HISTORY_ENTRIES) {
      updatedHistory = updatedHistory.slice(0, MAX_HISTORY_ENTRIES);
    }

    const { error } = await supabase
      .from("leads")
      .update({ history: toJson(updatedHistory) })
      .eq("id", leadId);

    if (error) {
      console.error("Erro ao adicionar histórico:", error);
      return null;
    }

    return updatedHistory;
  };

  return { addHistoryEntry };
}

// Standalone function for use outside React components
export async function addLeadHistoryEntry({
  leadId,
  action,
  details,
  userEmail,
  currentHistory = [],
}: {
  leadId: string;
  action: string;
  details: string;
  userEmail?: string;
  currentHistory?: HistoryEntry[];
}): Promise<HistoryEntry[] | null> {
  const newEntry: HistoryEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    user: userEmail ?? "Usuário",
    action,
    details,
  };

  let updatedHistory = [newEntry, ...currentHistory];
  if (updatedHistory.length > MAX_HISTORY_ENTRIES) {
    updatedHistory = updatedHistory.slice(0, MAX_HISTORY_ENTRIES);
  }

  const { error } = await supabase
    .from("leads")
    .update({ history: toJson(updatedHistory) })
    .eq("id", leadId);

  if (error) {
    console.error("Erro ao adicionar histórico:", error);
    return null;
  }

  return updatedHistory;
}
