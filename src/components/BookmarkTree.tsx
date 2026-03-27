import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { ChevronRight, Folder, FolderOpen, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { getAncestors } from "@/lib/bookmarks";
import { Separator } from "@/components/ui/separator";
import type { BookmarkNode } from "@/types";

const EXPANDED_KEY = "nova-expanded-folders";

function loadPersistedIds(): Set<string> | null {
  try {
    const raw = localStorage.getItem(EXPANDED_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {}
  return null;
}

function saveExpandedIds(ids: Set<string>): void {
  localStorage.setItem(EXPANDED_KEY, JSON.stringify([...ids]));
}

function collectAllFolderIds(nodes: BookmarkNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.type !== "folder") continue;
    ids.push(node.id);
    if (node.children) ids.push(...collectAllFolderIds(node.children));
  }
  return ids;
}

export interface BookmarkTreeHandle {
  collapseAll: () => void;
  expandAll: () => void;
}

interface BookmarkTreeProps {
  roots: BookmarkNode[];
  selectedFolderId: string | null;
  onFolderSelect: (id: string | null) => void;
  pinnedFolders?: BookmarkNode[];
  onReorderPinned?: (activeId: string, overId: string) => void;
  pinnedIds?: string[];
  onPin?: (id: string) => void;
  onUnpin?: (id: string) => void;
}

interface TreeNodeProps {
  node: BookmarkNode;
  depth: number;
  selectedFolderId: string | null;
  onFolderSelect: (id: string | null) => void;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  pinnedIds: string[];
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
}

function TreeNode({
  node,
  depth,
  selectedFolderId,
  onFolderSelect,
  expandedIds,
  toggleExpanded,
  pinnedIds,
  onPin,
  onUnpin,
}: TreeNodeProps) {
  const { t } = useTranslation();
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedFolderId === node.id;
  const hasChildren = (node.children ?? []).filter((c) => c.type === "folder").length > 0;
  const isStarred = pinnedIds.includes(node.id);

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer select-none text-sm transition-colors",
              isSelected
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
            style={{ paddingLeft: `${8 + depth * 16}px` }}
            onClick={() => {
              onFolderSelect(node.id);
              if (hasChildren) toggleExpanded(node.id);
            }}
          >
            <button
              className={cn(
                "flex-shrink-0 w-4 h-4 flex items-center justify-center rounded transition-transform",
                !hasChildren && "invisible"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) toggleExpanded(node.id);
              }}
            >
              <ChevronRight
                size={12}
                className={cn("transition-transform duration-200", isExpanded && "rotate-90")}
              />
            </button>

            {isExpanded && hasChildren ? (
              <FolderOpen size={14} className="flex-shrink-0 text-sidebar-foreground/70" />
            ) : (
              <Folder size={14} className="flex-shrink-0 text-sidebar-foreground/70" />
            )}

            <span className="truncate">{node.title}</span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {isStarred ? (
            <ContextMenuItem onClick={() => onUnpin(node.id)}>
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              {t("pin.unpin")}
            </ContextMenuItem>
          ) : (
            <ContextMenuItem onClick={() => onPin(node.id)}>
              <Star size={14} />
              {t("pin.pin")}
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {isExpanded && hasChildren && (
        <div>
          {(node.children ?? [])
            .filter((c) => c.type === "folder")
            .map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedFolderId={selectedFolderId}
                onFolderSelect={onFolderSelect}
                expandedIds={expandedIds}
                toggleExpanded={toggleExpanded}
                pinnedIds={pinnedIds}
                onPin={onPin}
                onUnpin={onUnpin}
              />
            ))}
        </div>
      )}
    </div>
  );
}

interface PinnedSectionProps {
  pinnedFolders: BookmarkNode[];
  selectedFolderId: string | null;
  onFolderSelect: (id: string | null) => void;
  onReorder?: (activeId: string, overId: string) => void;
  onUnpin: (id: string) => void;
}

interface SortablePinnedItemProps {
  folder: BookmarkNode;
  isSelected: boolean;
  onFolderSelect: (id: string | null) => void;
  onUnpin: (id: string) => void;
}

function SortablePinnedItem({ folder, isSelected, onFolderSelect, onUnpin }: SortablePinnedItemProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: folder.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer select-none text-sm transition-colors",
            isSelected
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
          onClick={() => onFolderSelect(folder.id)}
        >
          <span
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
          </span>
          <Folder size={14} className="flex-shrink-0 text-sidebar-foreground/70" />
          <span className="truncate">{folder.title}</span>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onUnpin(folder.id)}>
          <Star size={14} className="fill-yellow-400 text-yellow-400" />
          {t("pin.unpin")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function PinnedSection({ pinnedFolders, selectedFolderId, onFolderSelect, onReorder, onUnpin }: PinnedSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  if (pinnedFolders.length === 0) return null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder?.(String(active.id), String(over.id));
    }
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={pinnedFolders.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-0.5">
            {pinnedFolders.map((folder) => (
              <SortablePinnedItem
                key={folder.id}
                folder={folder}
                isSelected={selectedFolderId === folder.id}
                onFolderSelect={onFolderSelect}
                onUnpin={onUnpin}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Separator className="my-2" />
    </>
  );
}

export const BookmarkTree = forwardRef<BookmarkTreeHandle, BookmarkTreeProps>(
  function BookmarkTree({ roots, selectedFolderId, onFolderSelect, pinnedFolders = [], onReorderPinned, pinnedIds = [], onPin, onUnpin }, ref) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(() => loadPersistedIds() ?? new Set());
    const rootsRef = useRef(roots);
    rootsRef.current = roots;

    useEffect(() => {
      if (roots.length === 0) return;
      setExpandedIds((prev) => {
        if (localStorage.getItem(EXPANDED_KEY) !== null) return prev;
        const defaults = new Set(roots.filter((n) => n.type === "folder").map((n) => n.id));
        saveExpandedIds(defaults);
        return defaults;
      });
    }, [roots]);

    const toggleExpanded = (id: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        saveExpandedIds(next);
        return next;
      });
    };

    useEffect(() => {
      if (!selectedFolderId || roots.length === 0) return;
      const ancestors = getAncestors(roots, selectedFolderId);
      if (ancestors.length === 0) return;
      setExpandedIds((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const a of ancestors) {
          if (!next.has(a.id)) {
            next.add(a.id);
            changed = true;
          }
        }
        if (!changed) return prev;
        saveExpandedIds(next);
        return next;
      });
    }, [selectedFolderId, roots]);

    useImperativeHandle(ref, () => ({
      collapseAll() {
        const empty = new Set<string>();
        setExpandedIds(empty);
        saveExpandedIds(empty);
      },
      expandAll() {
        const all = new Set(collectAllFolderIds(rootsRef.current));
        setExpandedIds(all);
        saveExpandedIds(all);
      },
    }));

    const handlePin = onPin ?? (() => {});
    const handleUnpin = onUnpin ?? (() => {});

    return (
      <div className="space-y-0.5">
        <PinnedSection
          pinnedFolders={pinnedFolders}
          selectedFolderId={selectedFolderId}
          onFolderSelect={onFolderSelect}
          onReorder={onReorderPinned}
          onUnpin={handleUnpin}
        />
        {roots.filter((n) => n.type === "folder").map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            selectedFolderId={selectedFolderId}
            onFolderSelect={onFolderSelect}
            expandedIds={expandedIds}
            toggleExpanded={toggleExpanded}
            pinnedIds={pinnedIds}
            onPin={handlePin}
            onUnpin={handleUnpin}
          />
        ))}
      </div>
    );
  }
);
