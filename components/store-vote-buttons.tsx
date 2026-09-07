"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { ConfidenceBadge } from "@/components/confidence-badge";
import { storeConfidence } from "@/lib/confidence";
import { cn } from "@/lib/utils";

type VoteAction = (storeId: string) => Promise<{ error?: string; success?: boolean }>;

export function StoreVoteButtons({
  storeId,
  likes,
  reports,
  likeAction,
  reportAction,
}: {
  storeId: string;
  likes: number;
  reports: number;
  likeAction: VoteAction;
  reportAction: VoteAction;
}) {
  const [isPending, startTransition] = useTransition();
  const [voted, setVoted] = useState<"like" | "report" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayLikes = likes + (voted === "like" ? 1 : 0);
  const displayReports = reports + (voted === "report" ? 1 : 0);
  const confidence = storeConfidence(displayLikes, displayReports);

  function handle(action: VoteAction, kind: "like" | "report") {
    if (voted !== null) return;
    setError(null);
    setVoted(kind);
    startTransition(async () => {
      const result = await action(storeId);
      if (result.error) {
        setError(result.error);
        setVoted(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-nowrap items-center gap-0">
        <div className="flex items-center">
          <button
            type="button"
            disabled={isPending || voted !== null}
            onClick={() => handle(likeAction, "like")}
            aria-label="J'aime ce magasin"
            aria-pressed={voted === "like"}
            className="text-muted-foreground hover:bg-accent flex size-6 shrink-0 items-center justify-center rounded-md disabled:opacity-50"
          >
            <ThumbsUp className={cn("size-3", voted === "like" && "fill-primary text-primary")} />
          </button>
          <span className="text-muted-foreground text-[11px] tabular-nums">{displayLikes}</span>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            disabled={isPending || voted !== null}
            onClick={() => handle(reportAction, "report")}
            aria-label="Signaler ce magasin"
            aria-pressed={voted === "report"}
            className="text-muted-foreground hover:bg-accent flex size-6 shrink-0 items-center justify-center rounded-md disabled:opacity-50"
          >
            <ThumbsDown className={cn("size-3", voted === "report" && "fill-current")} />
          </button>
          <span className="text-muted-foreground text-[11px] tabular-nums">{displayReports}</span>
        </div>
        <ConfidenceBadge
          confidence={confidence}
          className="ml-2 h-4 px-0.5 py-0 text-[10px] leading-none"
        />
      </div>
      {error && (
        <p className="text-destructive text-xs">
          {error}{" "}
          <Link href="/auth/sign-in" className="underline underline-offset-2">
            Se connecter
          </Link>
        </p>
      )}
    </div>
  );
}
