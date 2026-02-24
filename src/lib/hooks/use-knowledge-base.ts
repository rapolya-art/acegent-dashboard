"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { KBDocument } from "@/lib/types";

export function useDocuments(orgId: string | undefined) {
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("knowledge_base_documents")
      .select("*, agents(name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (err) setError(err.message);
    else setDocuments(data || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    refetch();
  }, [orgId, refetch]);

  return { documents, loading, error, refetch };
}

export function useDocument(docId: string | undefined) {
  const [document, setDocument] = useState<KBDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!docId) return;

    async function fetch() {
      const supabase = createClient();
      const { data } = await supabase
        .from("knowledge_base_documents")
        .select("*, agents(name)")
        .eq("id", docId)
        .single();

      setDocument(data);
      setLoading(false);
    }

    fetch();
  }, [docId]);

  return { document, loading };
}

export async function updateDocument(docId: string, updates: Partial<Pick<KBDocument, "title" | "content" | "status">>) {
  const supabase = createClient();
  const { error } = await supabase
    .from("knowledge_base_documents")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", docId);
  return { error };
}

export async function deleteDocument(docId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("knowledge_base_documents")
    .delete()
    .eq("id", docId);
  return { error };
}

export async function createDocument(doc: {
  organization_id: string;
  agent_id?: string;
  title: string;
  type: string;
  content: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("knowledge_base_documents")
    .insert({
      ...doc,
      status: "ready",
      chunks: Math.ceil((doc.content?.length || 0) / 500),
      size_bytes: new Blob([doc.content || ""]).size,
    })
    .select()
    .single();
  return { data, error };
}
