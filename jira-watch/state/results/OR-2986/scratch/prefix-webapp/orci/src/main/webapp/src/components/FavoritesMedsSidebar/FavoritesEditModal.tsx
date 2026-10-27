import { useEffect, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { GripVertical, X } from "react-bootstrap-icons";
import Select, {
  createFilter,
  CSSObjectWithLabel,
  SelectInstance,
} from "react-select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  addFavoriteMutation,
  getFavoritesOptions,
  getFavoritesQueryKey,
  getMedicationsOptions,
  removeFavoriteMutation,
  reorderMutation,
} from "../../api/generated/@tanstack/react-query.gen";
import { FavoriteMedicationDto } from "../../api/generated/types.gen";
import { ColorLabelSetting } from "../../types/ColorLabelSetting";
import { getMedicationLabelStyle } from "../../utils/medicationLabelStyle";

type MedOption = { value: string; label: string };

const FILTER_CONFIG = {
  ignoreCase: true,
  ignoreAccents: true,
  trim: true,
  matchFrom: "start" as const,
};

interface FavoritesEditModalProps {
  show: boolean;
  onHide: () => void;
}

export function FavoritesEditModal({ show, onHide }: FavoritesEditModalProps) {
  const queryClient = useQueryClient();
  const selectRef = useRef<SelectInstance<MedOption>>(null);

  const { data: allMedications = [] } = useQuery(getMedicationsOptions());
  const { data: favorites = [] } = useQuery(getFavoritesOptions());

  // Local ordered state for instant UI feedback on drag.
  // Syncs from the server list when items are added or removed,
  // preserving any local reordering already applied.
  const [orderedFavorites, setOrderedFavorites] = useState<
    FavoriteMedicationDto[]
  >([]);

  useEffect(() => {
    setOrderedFavorites((prev) => {
      const prevRank = new Map(prev.map((f, i) => [f.medicationIdentifier, i]));
      return [...favorites].sort((a, b) => {
        const ai = prevRank.get(a.medicationIdentifier!) ?? Infinity;
        const bi = prevRank.get(b.medicationIdentifier!) ?? Infinity;
        return ai - bi;
      });
    });
  }, [favorites]);

  const invalidateFavorites = () =>
    queryClient.invalidateQueries({ queryKey: getFavoritesQueryKey() });

  const { mutate: addFavorite } = useMutation({
    ...addFavoriteMutation(),
    onSuccess: invalidateFavorites,
  });

  const { mutate: removeFavorite } = useMutation({
    ...removeFavoriteMutation(),
    onSuccess: invalidateFavorites,
  });

  const { mutate: reorder } = useMutation({
    ...reorderMutation(),
    onSuccess: invalidateFavorites,
  });

  const debouncedReorder = useDebouncedCallback((ids: string[]) => {
    reorder({ body: ids });
  }, 750);

  const favoriteIds = new Set(favorites.map((f) => f.medicationIdentifier));
  const medicationOptions: MedOption[] = allMedications
    .filter(
      (m) => m.medicationIdentifier && !favoriteIds.has(m.medicationIdentifier),
    )
    .map((m) => ({ value: m.medicationIdentifier!, label: m.medicationName! }));

  function handleSelect(option: MedOption | null) {
    if (!option) return;
    addFavorite({ path: { medicationId: option.value } });
    selectRef.current?.clearValue();
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeFavorite = activeId
    ? orderedFavorites.find((f) => f.medicationIdentifier === activeId)
    : null;

  const isDraggable = orderedFavorites.length > 1;

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    setOrderedFavorites((prev) => {
      const oldIndex = prev.findIndex(
        (f) => f.medicationIdentifier === active.id,
      );
      const newIndex = prev.findIndex(
        (f) => f.medicationIdentifier === over.id,
      );
      const next = arrayMove(prev, oldIndex, newIndex);
      debouncedReorder(next.map((f) => f.medicationIdentifier!));
      return next;
    });
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Favorite Medications</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <label className="form-label fw-semibold mb-1" htmlFor="fav-med-search">
          Add a medication
        </label>
        <Select<MedOption>
          inputId="fav-med-search"
          ref={selectRef}
          options={medicationOptions}
          placeholder="Search medications..."
          filterOption={createFilter(FILTER_CONFIG)}
          onChange={handleSelect}
          value={null}
          isClearable
          styles={{
            menu: (base) => ({ ...base, zIndex: 9999 } as CSSObjectWithLabel),
            option: (base, { isSelected }) =>
              ({
                ...base,
                background: isSelected ? "#DEEBFF" : base.background,
                color: "black",
                fontWeight: isSelected ? "bold" : base.fontWeight,
              } as CSSObjectWithLabel),
            noOptionsMessage: (base) =>
              ({ ...base, textAlign: "left" } as CSSObjectWithLabel),
          }}
          noOptionsMessage={() => "No matching medications"}
        />

        <div className="mt-3">
          <p className="fw-semibold mb-1">
            Current favorites{" "}
            <span className="text-muted fw-normal">
              ({orderedFavorites.length})
            </span>
          </p>
          {orderedFavorites.length === 0 ? (
            <p className="text-muted small">No favorites added yet.</p>
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={({ active }) => setActiveId(active.id as string)}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveId(null)}
            >
              <SortableContext
                items={orderedFavorites.map((f) => f.medicationIdentifier!)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="list-unstyled mb-0">
                  {orderedFavorites.map((fav) => (
                    <SortableFavoriteItem
                      key={fav.medicationIdentifier}
                      favorite={fav}
                      isDraggable={isDraggable}
                      onRemove={() =>
                        removeFavorite({
                          path: { medicationId: fav.medicationIdentifier! },
                        })
                      }
                    />
                  ))}
                </ul>
              </SortableContext>

              <DragOverlay>
                {activeFavorite && (
                  <FavoriteItemContent
                    favorite={activeFavorite}
                    isDraggable
                    isDragOverlay
                  />
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
}

function SortableFavoriteItem({
  favorite,
  isDraggable,
  onRemove,
}: {
  favorite: FavoriteMedicationDto;
  isDraggable: boolean;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: favorite.medicationIdentifier! });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <FavoriteItemContent
        favorite={favorite}
        isDraggable={isDraggable}
        dragHandleProps={{ ...attributes, ...listeners }}
        onRemove={onRemove}
      />
    </li>
  );
}

function FavoriteItemContent({
  favorite,
  isDraggable,
  isDragOverlay = false,
  dragHandleProps,
  onRemove,
}: {
  favorite: FavoriteMedicationDto;
  isDraggable: boolean;
  isDragOverlay?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
  onRemove?: () => void;
}) {
  const colorSetting = favorite.colorLabelSettings as unknown as
    | ColorLabelSetting
    | null
    | undefined;
  const iconStyle =
    colorSetting != null ? getMedicationLabelStyle(colorSetting, true) : {};

  return (
    <div
      className="d-flex align-items-center gap-2 py-2 border-bottom"
      style={{
        background: isDragOverlay ? "#f8f9fa" : undefined,
        boxShadow: isDragOverlay ? "0 4px 12px rgba(0,0,0,0.15)" : undefined,
        borderRadius: isDragOverlay ? 4 : undefined,
        padding: isDragOverlay ? "8px 4px" : undefined,
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
      <div
        style={{
          width: 15,
          height: 20,
          flexShrink: 0,
          border: "1px solid #c4c4c4",
          backgroundSize: "145px",
          backgroundPosition: "left center",
          ...iconStyle,
        }}
      />
      <span
        className="flex-grow-1 small text-truncate"
        title={favorite.medicationName}
      >
        {favorite.medicationName}
      </span>
      {onRemove && (
        <button
          className="btn btn-link btn-sm p-0 text-secondary"
          onClick={onRemove}
          title={`Remove ${favorite.medicationName}`}
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
