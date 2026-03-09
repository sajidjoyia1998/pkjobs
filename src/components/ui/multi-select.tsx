import * as React from "react";
import { X, Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [tempSelected, setTempSelected] = React.useState<string[]>([]);

  const handleOpen = () => {
    setTempSelected([...selected]);
    setSearch("");
    setOpen(true);
  };

  const handleToggle = (value: string) => {
    setTempSelected((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const handleConfirm = () => {
    onChange(tempSelected);
    setOpen(false);
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== value));
  };

  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabels = selected
    .map((s) => options.find((o) => o.value === s)?.label)
    .filter(Boolean);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleOpen}
        className={cn(
          "w-full justify-between h-auto min-h-10 font-normal",
          className
        )}
      >
        <div className="flex flex-wrap gap-1 flex-1 text-left">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedLabels.map((label, index) => (
              <Badge
                key={selected[index]}
                variant="secondary"
                className="mr-1 mb-1"
              >
                {label}
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => handleRemove(selected[index], e)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            ))
          )}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Options</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>{tempSelected.length} selected</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setTempSelected(filteredOptions.map((o) => o.value))}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setTempSelected([])}
              >
                Clear all
              </button>
            </div>
          </div>
          <div className="flex-1 max-h-[40vh] border rounded-md overflow-y-auto">
            <div className="p-1">
              {filteredOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No results found</p>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = tempSelected.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      onClick={() => handleToggle(option.value)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 cursor-pointer rounded-sm hover:bg-accent",
                        isSelected && "bg-accent"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-sm border border-primary shrink-0",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="text-sm">{option.label}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              Confirm ({tempSelected.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
