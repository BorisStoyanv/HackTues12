"use client";

import { cn } from "@/lib/utils";
import { 
  Building2, 
  Megaphone, 
  Ticket, 
  Leaf, 
  GraduationCap, 
  Cpu, 
  LayoutGrid 
} from "lucide-react";

const CATEGORIES = [
  { id: "Infrastructure", label: "Infrastructure", icon: Building2, desc: "Urban & physical development" },
  { id: "Marketing", label: "Marketing", icon: Megaphone, desc: "Promotion & community outreach" },
  { id: "Events", label: "Events", icon: Ticket, desc: "Cultural & social gatherings" },
  { id: "Conservation", label: "Conservation", icon: Leaf, desc: "Environmental & green projects" },
  { id: "Education", label: "Education", icon: GraduationCap, desc: "Learning & research initiatives" },
  { id: "Technology", label: "Technology", icon: Cpu, desc: "Digital & software innovation" },
  { id: "Other", label: "Other", icon: LayoutGrid, desc: "Miscellaneous regional impact" },
] as const;

interface CategoryPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isActive = value === cat.id;

        return (
          <div
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className={cn(
              "group relative flex flex-col p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer overflow-hidden",
              isActive 
                ? "border-foreground bg-foreground text-background shadow-lg" 
                : "border-border/40 bg-muted/5 hover:border-foreground/20 hover:bg-muted/10"
            )}
          >
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center mb-3 transition-colors",
              isActive ? "bg-background text-foreground" : "bg-foreground/5 text-foreground group-hover:bg-foreground/10"
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="font-bold text-sm tracking-tight">{cat.label}</h4>
              <p className={cn(
                "text-[10px] leading-tight",
                isActive ? "text-background/60" : "text-muted-foreground"
              )}>
                {cat.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
