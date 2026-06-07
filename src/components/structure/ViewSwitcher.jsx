import { LayoutGrid, LayoutList, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ViewSwitcher({ currentView, onViewChange }) {
  const views = [
    { id: "hierarchical", label: "Hierarki", icon: GitBranch },
    { id: "list", label: "Daftar", icon: LayoutList },
    { id: "grid", label: "Grid", icon: LayoutGrid },
  ];

  return (
    <div className="flex gap-2">
      {views.map((view) => {
        const Icon = view.icon;
        return (
          <Button
            key={view.id}
            variant={currentView === view.id ? "default" : "outline"}
            size="sm"
            onClick={() => onViewChange(view.id)}
            className="gap-2"
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{view.label}</span>
          </Button>
        );
      })}
    </div>
  );
}