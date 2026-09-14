"use client";

import { Flag } from "lucide-react";
import { useActionState, useState } from "react";

import { signalerPseudo } from "@/app/(tabs)/magasins/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Pas de choix de motif (contrairement à SignalerDialog/SignalerMagasinDialog) : un
 *  pseudo n'a qu'une seule raison possible d'être signalé. */
export function SignalerPseudoDialog({ targetUserId }: { targetUserId: string }) {
  const [open, setOpen] = useState(false);
  const [handledSuccess, setHandledSuccess] = useState(false);
  const [reported, setReported] = useState(false);
  const action = signalerPseudo.bind(null, targetUserId);
  const [state, formAction, isPending] = useActionState(action, null);

  if (state?.success && !handledSuccess) {
    setHandledSuccess(true);
    setReported(true);
    setOpen(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setHandledSuccess(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={reported}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          aria-label="Signaler ce pseudo"
          className="text-muted-foreground/60 hover:text-muted-foreground flex size-4 shrink-0 items-center justify-center disabled:opacity-50"
        >
          <Flag className={cn("size-2.5", reported && "fill-current")} />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signaler ce pseudo</DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">
          À signaler s&apos;il est insultant, choquant, ou usurpe l&apos;identité de
          quelqu&apos;un/de l&apos;app.
        </p>

        {state?.error && <p className="text-destructive text-sm">{state.error}</p>}

        <form action={formAction}>
          <DialogFooter>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="flex-1">
                  Annuler
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? "Envoi..." : "Signaler"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
