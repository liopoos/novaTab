import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface SearchBarProps {
  searchQuery: string;
  onSearch: (q: string) => void;
  selectedFolderId: string | null;
}

export function SearchBar({ searchQuery, onSearch, selectedFolderId }: SearchBarProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue("");
    onSearch("");
  }, [selectedFolderId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleChange = (value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(value);
    }, 300);
  };

  const handleClear = () => {
    setInputValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onSearch("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setInputValue("");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onSearch("");
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative w-full">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("search.placeholder")}
        className={cn(
          "pl-9 border-0 shadow-none focus-visible:ring-0 !bg-transparent",
          inputValue ? "pr-8" : ""
        )}
      />
      {inputValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
