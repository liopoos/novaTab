import { forwardRef, useImperativeHandle, useState } from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { isChromeAvailable } from "@/lib/favicon";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground shadow-sm">
      {children}
    </kbd>
  );
}

interface ShortcutRowProps {
  label: string;
  keys: string[];
}

function ShortcutRow({ label, keys }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <Kbd key={i}>{k}</Kbd>
        ))}
      </div>
    </div>
  );
}

export interface ShortcutsDialogHandle {
  open: () => void;
}

export const ShortcutsDialog = forwardRef<ShortcutsDialogHandle, { onOpen?: () => void }>(
  function ShortcutsDialog({ onOpen }, ref) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    useImperativeHandle(ref, () => ({
      open() {
        setOpen(true);
      },
    }));

    const handleOpenChange = (next: boolean) => {
      if (next) onOpen?.();
      setOpen(next);
    };

    const navigationShortcuts: ShortcutRowProps[] = [
      { label: t("shortcuts.focusSearch"), keys: ["/"] },
      { label: t("shortcuts.goHome"), keys: ["H"] },
      { label: t("shortcuts.togglePin"), keys: ["P"] },
    ];

    if (isChromeAvailable) {
      navigationShortcuts.splice(2, 0,
        { label: t("shortcuts.goRecentlyClosed"), keys: ["R"] },
        { label: t("shortcuts.goMostVisited"), keys: ["M"] }
      );
    }

    const groups: { heading: string; shortcuts: ShortcutRowProps[] }[] = [
      {
        heading: t("shortcuts.navigation"),
        shortcuts: navigationShortcuts,
      },
      {
        heading: t("shortcuts.sidebar"),
        shortcuts: [
          { label: t("shortcuts.expandAll"), keys: ["]"] },
          { label: t("shortcuts.collapseAll"), keys: ["["] },
        ],
      },
      {
        heading: t("shortcuts.general"),
        shortcuts: [
          { label: t("shortcuts.showShortcuts"), keys: ["?"] },
        ],
      },
    ];

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Keyboard size={15} />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">{t("shortcuts.title")}</TooltipContent>
        </Tooltip>

        <DialogContent className="sm:max-w-sm p-4" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="pr-6">{t("shortcuts.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {groups.map(({ heading, shortcuts }) => (
              <div key={heading}>
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {heading}
                </p>
                <div>
                  {shortcuts.map((s) => (
                    <ShortcutRow key={s.label} label={s.label} keys={s.keys} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);
