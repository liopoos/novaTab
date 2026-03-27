import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeContext } from "@/contexts/ThemeContext";

type Theme = "light" | "dark" | "system";

const CYCLE: Theme[] = ["light", "dark", "system"];

const ICON: Record<Theme, React.ReactNode> = {
  light: <Sun size={15} />,
  dark: <Moon size={15} />,
  system: <Monitor size={15} />,
};

export function ThemeToggle() {
  const { theme, setTheme } = useThemeContext();

  const handleCycle = () => {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
    setTheme(next);
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleCycle} className="h-8 w-8">
      {ICON[theme]}
    </Button>
  );
}
