import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X, Tag as TagIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTags, Tag } from "@/hooks/useTags";

interface TagMultiSelectProps {
  value: string[];
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
}

export function TagMultiSelect({ value, onChange, disabled }: TagMultiSelectProps) {
  const { activeTags, getTagsByIds } = useTags();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedTags = getTagsByIds(value);

  const toggleTag = (tagId: string) => {
    if (value.includes(tagId)) {
      onChange(value.filter((id) => id !== tagId));
    } else {
      onChange([...value, tagId]);
    }
  };

  const removeTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((id) => id !== tagId));
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "w-full min-h-[40px] px-3 py-2 text-left bg-background border border-border/50 rounded-md",
          "flex flex-wrap gap-1.5 items-center",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "transition-colors",
          disabled && "opacity-50 cursor-not-allowed",
          open && "ring-2 ring-ring"
        )}
      >
        {selectedTags.length > 0 ? (
          selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
                border: `1px solid ${tag.color}40`,
              }}
            >
              {tag.name}
              <button
                type="button"
                onClick={(e) => removeTag(tag.id, e)}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-muted-foreground text-sm flex items-center gap-2">
            <TagIcon className="h-4 w-4" />
            Adicionar tags...
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground ml-auto transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[100001] mt-1 w-full bg-popover border border-border rounded-md shadow-lg overflow-hidden">
          {activeTags.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              <p>Nenhuma tag disponível.</p>
              <p className="text-xs">Crie tags em Meu Negócio.</p>
            </div>
          ) : (
            <div className="max-h-[200px] overflow-y-auto">
              {activeTags.map((tag) => {
                const isSelected = value.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "w-full px-3 py-2 flex items-center gap-2 text-left text-sm",
                      "hover:bg-accent transition-colors",
                      isSelected && "bg-accent/50"
                    )}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1">{tag.name}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
