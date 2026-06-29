import { useState } from "react";
import { Check, ChevronsUpDown, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface WarrantyProductComboboxProps {
  items: {
    id: string;
    name: string;
    category?: string | null;
    stock?: number | null;
    isLocked?: boolean;
    lockedReason?: string;
    badge?: string;
  }[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export function WarrantyProductCombobox({
  items,
  value,
  onValueChange,
  placeholder = "Selecione um produto...",
  disabled = false,
  isLoading = false,
}: WarrantyProductComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedItem = items.find((item) => item.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between bg-card border-border text-left font-normal"
        >
          <span
            className={cn(
              "truncate",
              selectedItem ? "text-primary" : "text-muted-foreground"
            )}
          >
            {selectedItem ? selectedItem.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width]"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Buscar produto..." />
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <>
                <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                <CommandGroup>
                  {items.map((item) => {
                    const isSelected = item.id === value;
                    return (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={(currentValue) => {
                          onValueChange(
                            currentValue === value ? "" : currentValue
                          );
                          setOpen(false);
                        }}
                        disabled={item.isLocked}
                        className={cn(
                          item.isLocked && "opacity-50 pointer-events-none"
                        )}
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {item.isLocked && (
                              <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                            )}
                            <span
                              className={cn(
                                "truncate",
                                isSelected
                                  ? "text-primary"
                                  : "text-foreground"
                              )}
                            >
                              {item.name}
                            </span>
                            {item.badge && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.isLocked && item.lockedReason && (
                              <span className="text-xs text-muted-foreground">
                                {item.lockedReason}
                              </span>
                            )}
                            {item.stock !== undefined && item.stock !== null && (
                              <span
                                className={cn(
                                  "text-xs",
                                  item.stock === 0
                                    ? "text-red-400"
                                    : "text-muted-foreground"
                                )}
                              >
                                {item.stock === 0
                                  ? "sem estoque"
                                  : `${item.stock} em estoque`}
                              </span>
                            )}
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
