import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  const handleToggle = () => {
    const next = isZh ? "en" : "zh";
    i18n.changeLanguage(next);
    localStorage.setItem("nova-language", next);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className="h-8 px-2 text-xs font-medium"
        >
          {isZh ? "EN" : "中"}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{t("language.toggle")}</TooltipContent>
    </Tooltip>
  );
}
