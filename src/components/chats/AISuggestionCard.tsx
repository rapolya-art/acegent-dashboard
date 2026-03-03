"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  suggestion: string;
  convId: number;
  onDismiss: () => void;
  onSent: (text: string) => void;
}

export function AISuggestionCard({ suggestion, convId, onDismiss, onSent }: Props) {
  const [sending, setSending] = useState(false);

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: suggestion }),
      });
      if (res.ok) {
        onSent(suggestion);
        onDismiss();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-4 my-2 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
      <p className="mb-2 text-xs font-semibold text-yellow-700">💡 AI suggestion</p>
      <p className="mb-3 text-sm text-gray-800 whitespace-pre-wrap">{suggestion}</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSend} disabled={sending}>
          {sending ? "Надсилаю..." : "✅ Надіслати"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Відхилити
        </Button>
      </div>
    </div>
  );
}
