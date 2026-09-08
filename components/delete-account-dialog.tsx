"use client";

import { ChevronRight, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { deleteAccount } from "@/app/(tabs)/profil/actions";
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

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(deleteAccount, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-destructive flex w-full items-center gap-3 py-2.5 text-left"
        >
          <Trash2 className="size-4 shrink-0" />
          <span className="flex-1 text-sm font-medium">Supprimer mon compte</span>
          <ChevronRight className="size-4 shrink-0" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer mon compte</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Cette action est définitive : ton profil, tes signalements et tes favoris seront
            supprimés. Confirme avec ton mot de passe.
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="deletePassword" className="text-sm font-medium">
              Mot de passe
            </label>
            <Input id="deletePassword" name="password" type="password" required />
          </div>

          {state?.error && <p className="text-destructive text-sm">{state.error}</p>}

          <DialogFooter>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="flex-1">
                  Annuler
                </Button>
              </DialogClose>
              <Button type="submit" variant="destructive" disabled={isPending} className="flex-1">
                {isPending ? "Suppression..." : "Supprimer définitivement"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
