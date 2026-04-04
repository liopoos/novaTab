import { useState, useCallback } from "react";
import { Wifi, CheckCircle2, XCircle, Loader2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBookmarkChecker } from "@/hooks/useBookmarkChecker";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
import type { BookmarkNode } from "@/types";

interface BookmarkCheckerDialogProps {
  bookmarks: BookmarkNode[];
  onDeleteDone?: () => Promise<void>;
}

type DeleteConfirmStep = "idle" | "confirm";

export function BookmarkCheckerDialog({ bookmarks, onDeleteDone }: BookmarkCheckerDialogProps) {
  const { t } = useTranslation();
  const { settings } = useSettingsContext();
  const [open, setOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteConfirmStep>("idle");

  const {
    phase,
    results,
    checkedCount,
    totalCount,
    okCount,
    failCount,
    currentDomain,
    start,
    cancel,
    reset,
    deleteFailedBookmarks,
  } = useBookmarkChecker();

  const progressValue = totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100);
  const linkCount = bookmarks.filter((b) => b.type === "link" && b.url).length;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        cancel();
        reset();
        setDeleteStep("idle");
      }
      setOpen(next);
    },
    [cancel, reset]
  );

  const handleStart = useCallback(() => {
    start(bookmarks, {
      concurrency: settings.checkerConcurrency,
      timeoutMs: settings.checkerTimeoutMs,
    });
  }, [start, bookmarks, settings.checkerConcurrency, settings.checkerTimeoutMs]);

  const handleDeleteClick = useCallback(() => {
    if (deleteStep === "idle") {
      setDeleteStep("confirm");
    } else {
      void deleteFailedBookmarks().then(() => onDeleteDone?.());
      setDeleteStep("idle");
    }
  }, [deleteStep, deleteFailedBookmarks, onDeleteDone]);

  const handleCancelDelete = useCallback(() => {
    setDeleteStep("idle");
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Wifi size={15} />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{t("checker.tooltip")}</TooltipContent>
      </Tooltip>

      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden flex flex-col max-h-[85dvh]"
        aria-describedby={undefined}
        showCloseButton={phase !== "running"}
      >
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wifi size={16} className="text-primary" />
            {t("checker.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col px-6 py-4 flex-1 min-h-0 overflow-hidden">
          {phase === "idle" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {t("checker.description", { count: linkCount })}
              </p>
              <Button
                onClick={handleStart}
                disabled={linkCount === 0}
                className="w-full"
              >
                {t("checker.startButton")}
              </Button>
            </div>
          )}

          {(phase === "running" || phase === "done" || phase === "cancelled") && (
            <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
              <div className="shrink-0 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {phase === "running"
                      ? t("checker.progress", { checked: checkedCount, total: totalCount })
                      : phase === "cancelled"
                      ? t("checker.cancelled")
                      : t("checker.done")}
                  </span>
                  <span className="tabular-nums font-medium">{progressValue}%</span>
                </div>
                <Progress value={progressValue} className="h-1.5" />
              </div>

              <div className="shrink-0 flex items-center gap-3">
                <div className="flex items-center gap-1.5 flex-1">
                  <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                  <span className="text-sm font-medium tabular-nums">{okCount}</span>
                  <span className="text-xs text-muted-foreground">{t("checker.accessible")}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-1">
                  <XCircle size={14} className="text-destructive shrink-0" />
                  <span className="text-sm font-medium tabular-nums">{failCount}</span>
                  <span className="text-xs text-muted-foreground">{t("checker.inaccessible")}</span>
                </div>
              </div>

              {results.length > 0 && (
                <div className="shrink-0 h-[calc(10*2.125rem)] overflow-y-auto border border-border rounded-md">
                  <div className="divide-y divide-border">
                    {results.map((r) => (
                      <div
                        key={r.bookmark.id}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs"
                      >
                        {r.status === "pending" ? (
                          <Loader2
                            size={11}
                            className="animate-spin shrink-0 text-muted-foreground"
                          />
                        ) : r.status === "ok" ? (
                          <CheckCircle2 size={11} className="shrink-0 text-green-500" />
                        ) : (
                          <XCircle size={11} className="shrink-0 text-destructive" />
                        )}
                        <span
                          className={cn(
                            "flex-1 truncate",
                            r.status === "fail"
                              ? "text-destructive"
                              : r.status === "pending"
                              ? "text-muted-foreground"
                              : "text-foreground"
                          )}
                          title={r.bookmark.url}
                        >
                          {r.bookmark.title || r.bookmark.url}
                        </span>
                        {r.status !== "pending" && (
                          <Badge
                            variant={r.status === "ok" ? "secondary" : "destructive"}
                            className="text-[10px] h-4 px-1.5 shrink-0"
                          >
                            {r.status === "ok" ? t("checker.ok") : t("checker.fail")}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="shrink-0 min-h-[1.25rem]">
                {phase === "running" && currentDomain && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 size={12} className="animate-spin shrink-0" />
                    <span className="truncate">{currentDomain}</span>
                  </div>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {phase === "running" && (
                  <Button variant="outline" size="sm" onClick={cancel} className="flex-1">
                    {t("checker.cancel")}
                  </Button>
                )}

                {(phase === "done" || phase === "cancelled") && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        reset();
                        setDeleteStep("idle");
                      }}
                      className="flex-1"
                    >
                      {t("checker.recheck")}
                    </Button>

                    {failCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        {deleteStep !== "idle" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelDelete}
                            className="text-xs px-2"
                          >
                            {t("checker.deleteCancel")}
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteClick}
                          className="gap-1.5"
                        >
                          <Trash2 size={13} />
                          {deleteStep === "idle" && t("checker.deleteButton", { count: failCount })}
                          {deleteStep === "confirm" && t("checker.deleteConfirm1")}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
