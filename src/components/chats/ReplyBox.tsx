"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  convId: number;
  onSent: (text: string) => void;
  disabled?: boolean;
}

export function ReplyBox({ convId, onSent, disabled }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  async function handleSend() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setText("");
        onSent(content);
        ref.current?.focus();
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex gap-2 border-t border-border p-3">
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Напишіть відповідь... (Enter — надіслати, Shift+Enter — новий рядок)"
        disabled={disabled || sending}
        rows={2}
        className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      />
      <Button
        onClick={handleSend}
        disabled={!text.trim() || sending || disabled}
        className="self-end"
      >
        Надіслати
      </Button>
    </div>
  );
}
