"use client";

import { Flag } from "lucide-react";
import { useActionState, useState } from "react";

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

type ReportState = { error?: string; success?: boolean } | null;
type ReportAction = (prevState: ReportState, formData: FormData) => Promise<ReportState>;

const noopAction: ReportAction = async () => null;

/** Regroupe "signaler ce contenu" et "signaler ce pseudo" derrière un seul bouton :
 *  deux signalements aux conséquences très différentes (contenu vs compte auteur), mais
 *  qui n'ont pas besoin de deux icônes séparées dans une UI déjà dense. Si pseudoAction
 *  n'est pas fourni (auteur admin, ou pas d'auteur résolu), saute directement sur le
 *  formulaire de contenu sans écran de choix, pour ne pas ajouter d'étape inutile quand
 *  il n'y a de toute façon qu'une seule option. */
export function SignalerMenu({
  contentTitle,
  contentReasons,
  contentAction,
  pseudoAction,
}: {
  contentTitle: string;
  contentReasons: string[];
  contentAction: ReportAction;
  pseudoAction?: ReportAction;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"choice" | "content" | "pseudo">(pseudoAction ? "choice" : "content");
  const [reported, setReported] = useState(false);
  const [handledContentSuccess, setHandledContentSuccess] = useState(false);
  const [handledPseudoSuccess, setHandledPseudoSuccess] = useState(false);

  const [contentState, contentFormAction, contentPending] = useActionState(contentAction, null);
  const [pseudoState, pseudoFormAction, pseudoPending] = useActionState(pseudoAction ?? noopAction, null);

  if (contentState?.success && !handledContentSuccess) {
    setHandledContentSuccess(true);
    setReported(true);
    setOpen(false);
  }
  if (pseudoState?.success && !handledPseudoSuccess) {
    setHandledPseudoSuccess(true);
    setReported(true);
    setOpen(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setHandledContentSuccess(false);
      setHandledPseudoSuccess(false);
      setStep(pseudoAction ? "choice" : "content");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={reported}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          aria-label="Signaler"
          className="text-muted-foreground hover:bg-accent flex size-6 shrink-0 items-center justify-center rounded-md disabled:opacity-50"
        >
          <Flag className={cn("size-3", reported && "fill-current")} />
        </button>
      </DialogTrigger>
      <DialogContent>
        {step === "choice" && (
          <>
            <DialogHeader>
              <DialogTitle>Que veux-tu signaler ?</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                onClick={() => setStep("content")}
              >
                {contentTitle}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="justify-start"
                onClick={() => setStep("pseudo")}
              >
                Signaler ce pseudo
              </Button>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="w-full">
                  Annuler
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}

        {step === "content" && (
          <>
            <DialogHeader>
              <DialogTitle>{contentTitle}</DialogTitle>
            </DialogHeader>
            <form action={contentFormAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Raison</span>
                <div className="flex flex-col gap-2">
                  {contentReasons.map((reason) => (
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

              {contentState?.error && <p className="text-destructive text-sm">{contentState.error}</p>}

              <DialogFooter>
                <div className="flex gap-2">
                  {pseudoAction ? (
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("choice")}>
                      Retour
                    </Button>
                  ) : (
                    <DialogClose asChild>
                      <Button type="button" variant="outline" className="flex-1">
                        Annuler
                      </Button>
                    </DialogClose>
                  )}
                  <Button type="submit" disabled={contentPending} className="flex-1">
                    {contentPending ? "Envoi..." : "Signaler"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </>
        )}

        {step === "pseudo" && (
          <>
            <DialogHeader>
              <DialogTitle>Signaler ce pseudo</DialogTitle>
            </DialogHeader>

            <p className="text-muted-foreground text-sm">
              À signaler s&apos;il est insultant, choquant, ou usurpe l&apos;identité de
              quelqu&apos;un/de l&apos;app.
            </p>

            {pseudoState?.error && <p className="text-destructive text-sm">{pseudoState.error}</p>}

            <form action={pseudoFormAction}>
              <DialogFooter>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("choice")}>
                    Retour
                  </Button>
                  <Button type="submit" disabled={pseudoPending} className="flex-1">
                    {pseudoPending ? "Envoi..." : "Signaler"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
