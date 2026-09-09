"use client";

import { Flag } from "lucide-react";
import { useActionState, useState } from "react";

import { signalerDisponibilite } from "@/app/(tabs)/magasins/actions";
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

// Le prix, la quantité et la nature se corrigent désormais directement via
// "Modifier le produit" : ce ne sont plus des raisons de signalement. Restent les
// éléments qu'on ne peut pas s'auto-corriger (identité du produit, photo, doublon)
// ou qui nécessitent une modération.
const REPORT_REASONS = ["Produit ou photo incorrect(e)", "Doublon", "Contenu inapproprié ou spam"];

export function SignalerDialog({ availabilityId }: { availabilityId: string }) {
  const [open, setOpen] = useState(false);
  const [handledSuccess, setHandledSuccess] = useState(false);
  const [reported, setReported] = useState(false);
  const action = signalerDisponibilite.bind(null, availabilityId);
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
          aria-label="Signaler cette disponibilité"
          className="text-muted-foreground hover:bg-accent ml-auto flex size-6 shrink-0 items-center justify-center rounded-md disabled:opacity-50"
        >
          <Flag className={cn("size-3", reported && "fill-current")} />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signaler cette disponibilité</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Raison</span>
            <div className="flex flex-col gap-2">
              {REPORT_REASONS.map((reason) => (
                <label key={reason} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    required
                    className="accent-primary size-4"
                  />
                  {reason}
                </label>
              ))}
            </div>
          </div>

          {state?.error && <p className="text-destructive text-sm">{state.error}</p>}

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
