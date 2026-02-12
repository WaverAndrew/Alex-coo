"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTION_CHIPS = [
  "How's revenue this month?",
  "Show margin trends",
  "Compare showrooms",
  "Top customers",
];

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }, [input, isLoading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSend(suggestion);
    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="border-t border-border bg-background">
      {/* Suggestion chips */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sparkles className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-1.5" />
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleSuggestionClick(chip)}
                disabled={isLoading}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 border border-border transition-all duration-200 disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="flex items-end gap-2 p-4">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (input.length === 0) setShowSuggestions(true);
            }}
            placeholder="Ask Alex anything about your business..."
            disabled={isLoading}
            rows={1}
            className={cn(
              "w-full resize-none rounded-xl px-4 py-3 text-sm text-foreground",
              "bg-muted/50 border border-border focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10",
              "placeholder:text-muted-foreground/60 outline-none transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200",
            input.trim() && !isLoading
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
              : "bg-accent/50 text-muted-foreground cursor-not-allowed"
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
