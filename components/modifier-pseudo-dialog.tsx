"use client";

import { Pencil } from "lucide-react";
import { useActionState, useState } from "react";

import { changerPseudo } from "@/app/(tabs)/profil/actions";
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
import { Input } from "@/components/ui/input";
import { PSEUDO_MAX_LENGTH } from "@/lib/pseudo-validation";

export function ModifierPseudoDialog({ currentPseudo }: { currentPseudo: string }) {
  const [open, setOpen] = useState(false);
  const [handledSuccess, setHandledSuccess] = useState(false);
  const [state, formAction, isPending] = useActionState(changerPseudo, null);

  if (state?.success && !handledSuccess) {
    setHandledSuccess(true);
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
          aria-label="Changer de pseudo"
          className="text-muted-foreground hover:bg-accent flex size-6 shrink-0 items-center justify-center rounded-md"
        >
          <Pencil className="size-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer de pseudo</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pseudo" className="text-sm font-medium">
              Nouveau pseudo
            </label>
            <Input
              id="pseudo"
              name="pseudo"
              type="text"
              autoComplete="nickname"
              required
              maxLength={PSEUDO_MAX_LENGTH}
              defaultValue={currentPseudo}
            />
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
                {isPending ? "Modification..." : "Modifier"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
