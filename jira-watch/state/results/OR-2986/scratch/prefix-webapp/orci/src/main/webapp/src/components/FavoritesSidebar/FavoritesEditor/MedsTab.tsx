import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SelectInstance } from "react-select";
import { MedicationSelect, MedOption } from "../MedicationSelect";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDebouncedCallback } from "use-debounce";
import {
  addFavoriteMutation,
  getFavoritesOptions,
  getFavoritesQueryKey,
  getMedicationsOptions,
  removeFavoriteMutation,
  reorderMutation,
} from "@api/@tanstack/react-query.gen";
import { FavoriteMedicationDto } from "@api";
import toast from "react-hot-toast";
import { FavoriteItemContent, SortableFavoriteItem } from "./SortableMed";
import { useAppQueryParams } from "../../../hooks/hooks";
import { useTrackingEvent } from "../../../hooks/useTrackingEvent";
import { EventType } from "../../../services/TrackingEventService";

export function MedsTab() {
  const queryClient = useQueryClient();
  const selectRef = useRef<SelectInstance<MedOption>>(null);
  const { patientId, caseId } = useAppQueryParams();
  const { recordEvent } = useTrackingEvent(patientId, caseId);

  const { data: allMedications = [] } = useQuery(getMedicationsOptions());
  const { data: favorites = [] } = useQuery(getFavoritesOptions());

  // Local ordered state for instant UI feedback on drag.
  // Syncs from the server list when items are added or removed,
  // preserving any local reordering already applied.
  const [orderedFavorites, setOrderedFavorites] = useState<
    FavoriteMedicationDto[]
  >([]);

  useEffect(() => {
    // when the server list of favorites changes, preserve local reordering
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

  const { mutate: addFavorite, isPending: isAddingFavorite } = useMutation({
    ...addFavoriteMutation(),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: getFavoritesQueryKey() });
      const previousFavorites = queryClient.getQueryData(
        getFavoritesQueryKey(),
      );
      queryClient.setQueryData(
        getFavoritesQueryKey(),
        (old: FavoriteMedicationDto[]) => [
          ...old,
          {
            // sneakily signal that this med is loading
            id: data.path.medicationId + "--loading",
            medicationIdentifier: data.path.medicationId,
            medicationName: data.path.medicationId,
          } as FavoriteMedicationDto,
        ],
      );
      return { previousFavorites };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(
        getFavoritesQueryKey(),
        context?.previousFavorites,
      );
      toast.error("Failed to add favorite");
      console.error(err);
    },
    onSuccess: invalidateFavorites,
  });

  const { mutate: removeFavorite, isPending: isRemovingFavorite } = useMutation(
    {
      ...removeFavoriteMutation(),
      onMutate: async (data) => {
        await queryClient.cancelQueries({ queryKey: getFavoritesQueryKey() });
        const previousFavorites = queryClient.getQueryData(
          getFavoritesQueryKey(),
        );
        queryClient.setQueryData(
          getFavoritesQueryKey(),
          (old: FavoriteMedicationDto[]) =>
            old.filter(
              (it) => it.medicationIdentifier !== data.path.medicationId,
            ),
        );
        return { previousFavorites, orderedFavorites };
      },
      onError: (err, _, context) => {
        if (context) {
          queryClient.setQueryData(
            getFavoritesQueryKey(),
            context.previousFavorites,
          );
          setOrderedFavorites(context.orderedFavorites);
        }
        toast.error("Failed to remove favorite");
        console.error(err);
      },
      onSuccess: invalidateFavorites,
    },
  );

  const { mutate: reorder } = useMutation({
    ...reorderMutation(),
    onSuccess: invalidateFavorites,
    onError: (err) => {
      toast.error("Failed to reorder favorites");
      console.error(err);
    },
  });

  const debouncedReorder = useDebouncedCallback((ids: string[]) => {
    reorder({ body: ids });
  }, 750);

  const medicationOptions: MedOption[] = useMemo(() => {
    const favoriteIds = new Set(favorites.map((f) => f.medicationIdentifier));
    return allMedications
      .filter(
        (m) =>
          m.medicationIdentifier && !favoriteIds.has(m.medicationIdentifier),
      )
      .map((m) => ({
        value: m.medicationIdentifier!,
        label: m.medicationName!,
      }));
  }, [allMedications, favorites]);

  const handleSelect = useCallback(
    (option: MedOption | null) => {
      if (!option) return;
      recordEvent(EventType.FAVORITES_MEDICATION_FAVORITED, {
        medicationName: option.label,
        medicationIdentifier: option.value,
      });
      addFavorite({ path: { medicationId: option.value } });
      selectRef.current?.clearValue();
    },
    [addFavorite, recordEvent],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeFavorite = useMemo(
    () =>
      activeId
        ? orderedFavorites.find((f) => f.medicationIdentifier === activeId)
        : null,
    [activeId, orderedFavorites],
  );

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

  const isReorderingTemporarilyDisabled =
    isAddingFavorite || isRemovingFavorite;
  const isDraggable = orderedFavorites.length > 1;

  return (
    <div>
      <label className="form-label fw-semibold mb-1" htmlFor="fav-med-search">
        Add a medication
      </label>
      <MedicationSelect
        inputId="fav-med-search"
        ref={selectRef}
        options={medicationOptions}
        onChange={handleSelect}
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
              disabled={isReorderingTemporarilyDisabled}
            >
              <ul
                className="list-unstyled mb-0"
                style={{ overflowY: "auto", maxHeight: "300px" }}
              >
                {orderedFavorites.map((fav) => (
                  <SortableFavoriteItem
                    key={fav.medicationIdentifier}
                    favorite={fav}
                    dragHandleVisibility={
                      isDraggable
                        ? isReorderingTemporarilyDisabled
                          ? "disabled"
                          : "enabled"
                        : "hidden"
                    }
                    onRemove={() => {
                      recordEvent(EventType.FAVORITES_MEDICATION_UNFAVORITED, {
                        medicationName: fav.medicationName,
                        medicationIdentifier: fav.medicationIdentifier,
                      });
                      removeFavorite({
                        path: { medicationId: fav.medicationIdentifier! },
                      });
                    }}
                  />
                ))}
              </ul>
            </SortableContext>

            <DragOverlay>
              {activeFavorite && (
                <FavoriteItemContent
                  favorite={activeFavorite}
                  dragHandleVisibility="enabled"
                  isDragOverlay
                />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
