import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search stocks...",
}: SearchInputProps) {
  return (
    <div className="relative w-44 md:w-56" data-ocid="search.input">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 h-9 text-sm bg-muted/50 border-border focus-visible:ring-primary/50"
      />
    </div>
  );
}
