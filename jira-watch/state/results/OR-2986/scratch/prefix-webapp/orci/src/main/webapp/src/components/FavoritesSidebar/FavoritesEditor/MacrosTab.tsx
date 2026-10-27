import { useState, useRef, useEffect, useMemo } from "react";
import {
  GripVertical,
  Pencil,
  PlusCircle,
  Star,
  StarFill,
} from "react-bootstrap-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteMacroMutation,
  getMacrosOptions,
  getMacrosQueryKey,
  getMedicationsOptions,
  reorderMacrosMutation,
  setMacroActiveMutation,
} from "@api/@tanstack/react-query.gen";
import { MedicationMacroDto } from "@api";
import { MacroEditView } from "./MacroEditView";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDebouncedCallback } from "use-debounce";
import toast from "react-hot-toast";
import { ConfirmDeleteButton } from "../ConfirmDeleteButton";
import { useAppQueryParams } from "../../../hooks/hooks";
import { useTrackingEvent } from "../../../hooks/useTrackingEvent";
import { EventType } from "../../../services/TrackingEventService";

export function MacrosTab() {
  const queryClient = useQueryClient();
  const { patientId, caseId } = useAppQueryParams();
  const { recordEvent } = useTrackingEvent(patientId, caseId);
  const { data: macros = [] } = useQuery(getMacrosOptions());
  const { data: allMedications = [] } = useQuery(getMedicationsOptions());

  const [editingMacroId, setEditingMacroId] = useState<string | null>(null);
  const [draftMacroName, setDraftMacroName] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newMacroName, setNewMacroName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [orderedMacros, setOrderedMacros] = useState<MedicationMacroDto[]>([]);

  useEffect(() => {
    setOrderedMacros((prev) => {
      const prevRank = new Map(prev.map((m, i) => [m.id, i]));
      return [...macros].sort((a, b) => {
        const ai = prevRank.get(a.id) ?? Infinity;
        const bi = prevRank.get(b.id) ?? Infinity;
        return ai - bi;
      });
    });
  }, [macros]);

  const invalidateMacros = () =>
    queryClient.invalidateQueries({ queryKey: getMacrosQueryKey() });

  const { mutate: deleteMacro } = useMutation({
    ...deleteMacroMutation(),
    onSuccess: invalidateMacros,
    onError: (err) => {
      toast.error("Failed to delete macro");
      console.error(err);
    },
  });

  const { mutate: setMacroActive } = useMutation({
    ...setMacroActiveMutation(),
    onSuccess: invalidateMacros,
    onError: (err) => {
      toast.error("Failed to update macro");
      console.error(err);
    },
  });

  const { mutate: reorder } = useMutation({
    ...reorderMacrosMutation(),
    onSuccess: invalidateMacros,
    onError: (err) => {
      toast.error("Failed to reorder macros");
      console.error(err);
    },
  });

  const debouncedReorder = useDebouncedCallback((ids: string[]) => {
    reorder({ body: ids });
  }, 750);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeMacro = useMemo(
    () => (activeId ? orderedMacros.find((m) => m.id === activeId) : null),
    [activeId, orderedMacros],
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    setOrderedMacros((prev) => {
      const oldIndex = prev.findIndex((m) => m.id === active.id);
      const newIndex = prev.findIndex((m) => m.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      debouncedReorder(next.map((m) => m.id));
      return next;
    });
  }

  const isDraggable = orderedMacros.length > 1;

  // Advances from the list "name" step to the draft edit view (no API call yet)
  function handleCreate() {
    const trimmed = newMacroName.trim();
    if (!trimmed) return;
    if (macros.some((m) => m.name === trimmed)) {
      setCreateError("A macro with that name already exists.");
      return;
    }
    setDraftMacroName(trimmed);
    setIsCreating(false);
    setNewMacroName("");
    setCreateError(null);
  }

  const createContainerRef = useRef<HTMLDivElement>(null);

  const resetCreate = () => {
    setIsCreating(false);
    setNewMacroName("");
    setCreateError(null);
  };

  useEffect(() => {
    if (!isCreating) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        createContainerRef.current &&
        !createContainerRef.current.contains(e.target as Node)
      ) {
        resetCreate();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCreating]);

  if (draftMacroName !== null || editingMacroId !== null) {
    return (
      <MacroEditView
        draftMacroName={draftMacroName}
        editingMacroId={editingMacroId}
        macros={macros}
        allMedications={allMedications}
        onBack={() => {
          setEditingMacroId(null);
          setDraftMacroName(null);
        }}
      />
    );
  }

  // --- List view ---
  return (
    <div>
      <p className="text-muted small mb-3">
        {
          "Selecting a macro from your favorites panel will open dosing window tabs for each medication in that macro."
        }
      </p>

      <div style={{ overflowY: "auto", maxHeight: "300px" }}>
        {orderedMacros.length > 0 && (
          <DndContext
            sensors={sensors}
            onDragStart={({ active }) => setActiveId(active.id as string)}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            <SortableContext
              items={orderedMacros.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="list-unstyled mb-0">
                {orderedMacros.map((macro, i) => (
                  <SortableMacroItem
                    key={macro.id}
                    macro={macro}
                    index={i}
                    isDraggable={isDraggable}
                    onEdit={() => setEditingMacroId(macro.id)}
                    onToggleActive={() => {
                      recordEvent(
                        macro.active
                          ? EventType.FAVORITES_MACRO_UNFAVORITED
                          : EventType.FAVORITES_MACRO_FAVORITED,
                        {
                          macroName: macro.name,
                          macroId: macro.id,
                        },
                      );
                      setMacroActive({
                        path: { macroId: macro.id },
                        body: !macro.active,
                      });
                    }}
                    onDelete={() => {
                      recordEvent(EventType.FAVORITES_MACRO_DELETED, {
                        macroName: macro.name,
                        macroId: macro.id,
                      });
                      deleteMacro({ path: { macroId: macro.id } });
                    }}
                  />
                ))}
              </ul>
            </SortableContext>

            <DragOverlay>
              {activeMacro && (
                <MacroItemContent
                  macro={activeMacro}
                  index={0}
                  isDraggable
                  isDragOverlay
                  onEdit={() => {}}
                />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <div className="mt-2">
        {isCreating ? (
          <div ref={createContainerRef}>
            <div className="d-flex gap-2">
              <input
                className={`form-control form-control-sm flex-grow-1${
                  createError ? " is-invalid" : ""
                }`}
                placeholder="Macro name"
                value={newMacroName}
                onChange={(e) => {
                  setNewMacroName(e.target.value);
                  setCreateError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") {
                    e.preventDefault();
                    resetCreate();
                  }
                }}
                autoFocus
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleCreate}
                disabled={!newMacroName.trim()}
              >
                Create
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  resetCreate();
                }}
              >
                Cancel
              </button>
            </div>
            {createError && (
              <div className="text-danger mt-1" style={{ fontSize: "0.8rem" }}>
                {createError}
              </div>
            )}
          </div>
        ) : (
          <button
            className="btn btn-link px-1 d-flex align-items-center gap-2 text-body text-decoration-none"
            style={{ fontSize: "0.9rem" }}
            onClick={() => setIsCreating(true)}
          >
            <PlusCircle size={15} />
            Create Custom Macro
          </button>
        )}
      </div>
    </div>
  );
}

function SortableMacroItem({
  macro,
  index,
  isDraggable,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  macro: MedicationMacroDto;
  index: number;
  isDraggable: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: macro.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <MacroItemContent
        macro={macro}
        index={index}
        isDraggable={isDraggable}
        dragHandleProps={{ ...attributes, ...listeners }}
        onEdit={onEdit}
        onToggleActive={onToggleActive}
        onDelete={onDelete}
      />
    </li>
  );
}

function MacroItemContent({
  macro,
  index,
  isDraggable,
  isDragOverlay = false,
  dragHandleProps,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  macro: MedicationMacroDto;
  index: number;
  isDraggable: boolean;
  isDragOverlay?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
  onEdit: () => void;
  onToggleActive?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={
        "fav-item-row d-flex align-items-center gap-2 mb-2 border-bottom p-1" +
        (index === 0 ? " border-top" : "")
      }
      style={{
        background: isDragOverlay ? "#f8f9fa" : undefined,
        boxShadow: isDragOverlay ? "0 4px 12px rgba(0,0,0,0.15)" : undefined,
        borderRadius: isDragOverlay ? 4 : undefined,
      }}
    >
      <span
        {...dragHandleProps}
        style={{
          cursor: isDraggable ? "grab" : "default",
          color: isDraggable ? "#adb5bd" : "transparent",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          touchAction: "none",
        }}
      >
        <GripVertical size={16} />
      </span>
      {onToggleActive && (
        <button
          className="btn p-0"
          onClick={onToggleActive}
          title={macro.active ? "Hide from sidebar" : "Show in sidebar"}
          style={{ color: macro.active ? undefined : "#adb5bd" }}
        >
          {macro.active ? <StarFill size={15} /> : <Star size={15} />}
        </button>
      )}
      {!onToggleActive && <StarFill size={15} />}
      <div
        role="button"
        className="d-flex align-items-center gap-2 flex-grow-1"
        onClick={onEdit}
      >
        <span
          className="fw-semibold flex-grow-1"
          style={{ fontSize: "0.9rem" }}
        >
          {macro.name}
        </span>
        <button
          className="fav-item-action-btn btn p-0 edit-button"
          style={{ fontSize: "0.75rem" }}
          title={`Edit ${macro.name}`}
        >
          <Pencil />
        </button>
      </div>
      {onDelete && (
        <ConfirmDeleteButton
          className="fav-item-action-btn btn btn-sm p-0"
          onDelete={onDelete}
          title={`Delete ${macro.name}`}
        />
      )}
    </div>
  );
}
