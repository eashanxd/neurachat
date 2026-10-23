
"use client";

import { Bot, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type ChatHeaderProps = {
  onOpenSidebar: () => void;
};

export function ChatHeader({ onOpenSidebar }: ChatHeaderProps) {
  return (
    <header className="flex h-[65px] shrink-0 items-center border-b border-[#302B23] bg-[#0C0C0B] px-3 sm:px-5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onOpenSidebar}
        aria-label="Open sidebar"
        className="mr-4 h-9 w-9 text-[#8D877D] hover:bg-[#211E18] hover:text-[#E5C477]"
      >
        <PanelLeft className="h-[17px] w-[17px]" />
      </Button>

      <div className="mr-4 h-7 w-px bg-[#302B23]" />

      <div className="flex min-w-0 items-center gap-3">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#514022] bg-[#201B11]">
          <Bot className="h-[18px] w-[18px] text-[#D6A84F]" />
          <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-[#0C0C0B] bg-[#D6A84F]" />
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold tracking-tight text-[#F2EEE6]">
            NeuraChat
          </h1>
          <p className="mt-1 text-[10px] tracking-[0.14em] text-[#8D877D]">
            PERSONAL INTELLIGENCE
          </p>
        </div>
      </div>
    </header>
  );
}
