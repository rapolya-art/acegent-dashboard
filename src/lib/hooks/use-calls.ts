"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Call, TranscriptSegment, CallStats } from "@/lib/types";

interface CallFilters {
  search?: string;
  status?: string;
  sentiment?: string;
  limit?: number;
}

export function useCalls(orgId: string | undefined, filters?: CallFilters) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;

    async function fetch() {
      const supabase = createClient();
      let query = supabase
        .from("calls")
        .select("*, agents(name), leads(name, phone)")
        .eq("organization_id", orgId)
        .order("started_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters?.sentiment && filters.sentiment !== "all") {
        query = query.eq("sentiment", filters.sentiment);
      }
      if (filters?.search) {
        query = query.ilike("caller_phone", `%${filters.search}%`);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error: err } = await query;

      if (err) setError(err.message);
      else setCalls(data || []);
      setLoading(false);
    }

    fetch();
  }, [orgId, filters?.search, filters?.status, filters?.sentiment, filters?.limit]);

  return { calls, loading, error };
}

export function useCall(callId: string | undefined) {
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!callId) { setLoading(false); return; }

    async function fetch() {
      const supabase = createClient();
      const { data } = await supabase
        .from("calls")
        .select("*, agents(name)")
        .eq("id", callId)
        .single();

      setCall(data);
      setLoading(false);
    }

    fetch();
  }, [callId]);

  return { call, loading };
}

export function useTranscript(callId: string | undefined) {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!callId) { setLoading(false); return; }

    async function fetch() {
      const supabase = createClient();
      const { data } = await supabase
        .from("transcript_segments")
        .select("*")
        .eq("call_id", callId)
        .order("start_time", { ascending: true });

      setSegments(data || []);
      setLoading(false);
    }

    fetch();
  }, [callId]);

  return { segments, loading };
}

export function useCallStats(orgId: string | undefined) {
  const [stats, setStats] = useState<CallStats>({
    calls_today: 0,
    avg_duration_seconds: 0,
    success_rate: 0,
    minutes_used: 0,
    minutes_limit: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    async function fetch() {
      const supabase = createClient();

      // Today's calls
      const today = new Date().toISOString().split("T")[0];
      const { count: todayCount } = await supabase
        .from("calls")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .gte("started_at", `${today}T00:00:00`);

      // Completed calls for avg duration + success rate
      const { data: completedCalls } = await supabase
        .from("calls")
        .select("duration_seconds, status")
        .eq("organization_id", orgId)
        .eq("status", "completed");

      const completed = completedCalls || [];
      const avgDuration = completed.length > 0
        ? completed.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / completed.length
        : 0;

      // All calls for success rate
      const { count: totalCount } = await supabase
        .from("calls")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);

      const successRate = totalCount && totalCount > 0
        ? (completed.length / totalCount) * 100
        : 0;

      // Org limits
      const { data: org } = await supabase
        .from("organizations")
        .select("minutes_used, minutes_limit")
        .eq("id", orgId)
        .single();

      setStats({
        calls_today: todayCount || 0,
        avg_duration_seconds: Math.round(avgDuration),
        success_rate: Math.round(successRate),
        minutes_used: org?.minutes_used || 0,
        minutes_limit: org?.minutes_limit || 0,
      });
      setLoading(false);
    }

    fetch();
  }, [orgId]);

  return { stats, loading };
}
