import {
  MedicationMacroDto,
  MedicationMacroItemDto,
  MedicationOptionDto,
} from "@api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { SelectInstance } from "react-select";
import { MedicationSelect, MedOption } from "../MedicationSelect";
import {
  addItemMutation,
  createMacroMutation,
  deleteMacroMutation,
  getMacrosQueryKey,
  removeItemMutation,
  renameMacroMutation,
  reorderItemsMutation,
} from "@api/@tanstack/react-query.gen";
import { useDebouncedCallback } from "use-debounce";
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
import { ChevronLeft, StarFill } from "react-bootstrap-icons";
import { ConfirmDeleteButton } from "../ConfirmDeleteButton";
import { FavoriteItemContent, SortableFavoriteItem } from "./SortableMed";
import toast from "react-hot-toast";
import { useAppQueryParams } from "../../../hooks/hooks";
import { useTrackingEvent } from "../../../hooks/useTrackingEvent";
import { EventType } from "../../../services/TrackingEventService";

export function MacroEditView({
  draftMacroName,
  editingMacroId,
  macros,
  allMedications,
  onBack,
}: {
  draftMacroName: string | null;
  editingMacroId: string | null;
  macros: MedicationMacroDto[];
  allMedications: MedicationOptionDto[];
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const selectRef = useRef<SelectInstance<MedOption>>(null);
  const { patientId, caseId } = useAppQueryParams();
  const { recordEvent } = useTrackingEvent(patientId, caseId);
  // Prevents useEffect from re-sorting orderedItems while a replace sequence is in flight

  // resolvedMacroId is null in draft mode; updated to the real ID after creation
  const [resolvedMacroId, setResolvedMacroId] = useState<string | null>(
    editingMacroId,
  );
  // confirmedName tracks the header display name (updated on blur; separate from live input)
  const [confirmedName, setConfirmedName] = useState(draftMacroName ?? "");
  const [draftName, setDraftName] = useState(draftMacroName ?? "");
  const [orderedItems, setOrderedItems] = useState<MedicationMacroItemDto[]>(
    [],
  );
  const [showAddSelect, setShowAddSelect] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [addMedError, setAddMedError] = useState<string | null>(null);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const isDraft = resolvedMacroId === null;
  const editingMacro = macros.find((m) => m.id === resolvedMacroId) ?? null;
  const displayName = editingMacro?.name ?? confirmedName;

  useEffect(() => {
    if (resolvedMacroId === null) return;
    setItemsError(null);
    const macro = macros.find((m) => m.id === resolvedMacroId);
    if (macro) {
      setDraftName(macro.name);
      setOrderedItems((prev) => {
        const prevRank = new Map(prev.map((item, i) => [item.id, i]));
        return [...macro.items].sort((a, b) => {
          const ai = prevRank.get(a.id) ?? Infinity;
          const bi = prevRank.get(b.id) ?? Infinity;
          return ai - bi;
        });
      });
    }
  }, [resolvedMacroId, macros]);

  const invalidateMacros = () =>
    queryClient.invalidateQueries({ queryKey: getMacrosQueryKey() });

  const { mutateAsync: createMacroAsync, isPending: isCreatingMacro } =
    useMutation({
      ...createMacroMutation(),
      onMutate: async () => {
        const item = {
          // sneakily signal that this item is loading
          id: "fake--loading",
          medicationIdentifier: "",
          medicationName: "",
          position: -1,
          colorLabelSettings: {},
        } as MedicationMacroItemDto;
        setOrderedItems([item]);
      },
      onSuccess: (newMacro) => {
        invalidateMacros();
        setResolvedMacroId(newMacro.id);
        setNameError(null);
      },
      onError: (error: any) => {
        if (error?.response?.status === 409) {
          setNameError("A macro with that name already exists.");
        }
      },
    });

  const { mutate: renameMacro } = useMutation({
    ...renameMacroMutation(),
    onSuccess: () => {
      invalidateMacros();
      setNameError(null);
    },
    onError: (error: any) => {
      if (error?.response?.status === 409) {
        setNameError("A macro with that name already exists.");
        if (editingMacro) setDraftName(editingMacro.name);
      }
    },
  });

  const { mutate: deleteMacro } = useMutation({
    ...deleteMacroMutation(),
    onSuccess: () => {
      invalidateMacros();
      onBack();
    },
  });

  const { mutate: addItem, mutateAsync: addItemAsync } = useMutation({
    ...addItemMutation(),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: getMacrosQueryKey() });
      const previousItems = queryClient.getQueryData(getMacrosQueryKey());
      const item = {
        // sneakily signal that this item is loading
        id: data.path.medicationId + "--loading",
        medicationIdentifier: data.path.medicationId,
        medicationName: "",
        position: -1,
        colorLabelSettings: {},
      } as MedicationMacroItemDto;
      queryClient.setQueryData(
        getMacrosQueryKey(),
        (old: MedicationMacroDto[]) =>
          old.map((macro) =>
            macro.id === data.path.macroId
              ? { ...macro, items: [...macro.items, item] }
              : macro,
          ),
      );
      return { previousItems };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(getMacrosQueryKey(), context?.previousItems);
      toast.error("Failed to add item");
      console.error(err);
    },
    onSuccess: () => {
      invalidateMacros();
      setItemsError(null);
      setAddMedError(null);
    },
  });

  const { mutate: removeItem, mutateAsync: removeItemAsync } = useMutation({
    ...removeItemMutation(),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: getMacrosQueryKey() });
      const previousItems = queryClient.getQueryData(getMacrosQueryKey());
      queryClient.setQueryData(
        getMacrosQueryKey(),
        (old: MedicationMacroDto[]) =>
          old.map((macro) =>
            macro.id === data.path.macroId
              ? {
                  ...macro,
                  items: macro.items.filter(
                    (item) =>
                      item.medicationIdentifier !== data.path.medicationId,
                  ),
                }
              : macro,
          ),
      );
      return { previousItems };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(getMacrosQueryKey(), context?.previousItems);
      toast.error("Failed to remove item");
      console.error(err);
    },
    onSuccess: invalidateMacros,
  });

  const { mutate: reorderItems, mutateAsync: reorderItemsAsync } = useMutation({
    ...reorderItemsMutation(),
    onSuccess: invalidateMacros,
  });

  const debouncedReorderItems = useDebouncedCallback(
    (macroId: string, ids: string[]) => {
      reorderItems({ path: { macroId }, body: ids });
    },
    750,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const activeItem = activeId
    ? orderedItems.find((item) => item.medicationIdentifier === activeId)
    : null;

  const macroItemIds = new Set(
    orderedItems.map((item) => item.medicationIdentifier),
  );
  const medicationOptions: MedOption[] = allMedications
    .filter(
      (m) =>
        m.medicationIdentifier && !macroItemIds.has(m.medicationIdentifier),
    )
    .map((m) => ({ value: m.medicationIdentifier!, label: m.medicationName! }));

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over || active.id === over.id || !resolvedMacroId) return;
    setOrderedItems((prev) => {
      const oldIndex = prev.findIndex(
        (item) => item.medicationIdentifier === active.id,
      );
      const newIndex = prev.findIndex(
        (item) => item.medicationIdentifier === over.id,
      );
      const next = arrayMove(prev, oldIndex, newIndex);
      debouncedReorderItems(
        resolvedMacroId,
        next.map((item) => item.medicationIdentifier),
      );
      return next;
    });
  }

  function handleNameBlur() {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    if (isDraft) {
      setConfirmedName(trimmed);
      setNameError(null);
      return;
    }
    if (!resolvedMacroId || !editingMacro) return;
    if (trimmed === editingMacro.name) return;
    if (macros.some((m) => m.id !== resolvedMacroId && m.name === trimmed)) {
      setNameError("A macro with that name already exists.");
      setDraftName(editingMacro.name);
      return;
    }
    setNameError(null);
    renameMacro({
      path: { macroId: resolvedMacroId },
      body: { name: trimmed },
    });
  }

  function handleBack() {
    if (isDraft) {
      onBack();
      return;
    }
    if (orderedItems.length === 0) {
      setItemsError("Add at least one medication before saving.");
      return;
    }
    onBack();
  }

  async function handleSelectMed(option: MedOption | null) {
    if (!option) return;
    if (macroItemIds.has(option.value)) {
      setAddMedError(`${option.label} is already in this macro.`);
      selectRef.current?.clearValue();
      return;
    }
    setAddMedError(null);
    setShowAddSelect(false);
    if (isDraft) {
      selectRef.current?.clearValue();
      try {
        const newMacro = await createMacroAsync({
          body: { name: confirmedName },
        });
        recordEvent(EventType.FAVORITES_MACRO_CREATED, {
          macroName: confirmedName,
          macroId: newMacro.id,
        });
        recordEvent(EventType.FAVORITES_MACRO_FAVORITED, {
          macroName: confirmedName,
          macroId: newMacro.id,
        });
        await addItemAsync({
          path: { macroId: newMacro.id, medicationId: option.value },
        });
      } catch {
        // Handled by mutation onError callbacks
      }
      return;
    }
    if (!resolvedMacroId) return;
    addItem({ path: { macroId: resolvedMacroId, medicationId: option.value } });
    selectRef.current?.clearValue();
  }

  return (
    <div>
      <p className="text-muted small mb-3">
        {
          "Selecting a macro from your favorites panel will open dosing window tabs for each medication in that macro."
        }
      </p>

      {/* Selected macro header — click to go back to list */}
      <div
        className="d-flex align-items-center gap-2 px-2 py-2 mb-3 rounded"
        style={{ background: "#e8ecf8", cursor: "pointer" }}
        onClick={handleBack}
        title="Back to macros"
      >
        <button
          className="btn btn-link p-0 d-flex align-items-center"
          style={{ color: "inherit" }}
          tabIndex={-1}
        >
          <ChevronLeft size={15} />
        </button>
        <StarFill size={15} />
        <span className="fw-bold flex-grow-1" style={{ fontSize: "0.9rem" }}>
          {displayName}
        </span>
        {!isDraft && (
          <span onClick={(e) => e.stopPropagation()}>
            <ConfirmDeleteButton
              className="btn btn-link btn-sm p-0"
              onDelete={() => {
                recordEvent(EventType.FAVORITES_MACRO_DELETED, {
                  macroName: displayName,
                  macroId: resolvedMacroId,
                });
                deleteMacro({ path: { macroId: resolvedMacroId! } });
              }}
              title={`Delete ${displayName}`}
            />
          </span>
        )}
      </div>

      {/* Form */}
      <div className="row g-2 mb-2 align-items-center">
        <label className="col-form-label col-form-label-sm col-4 text-muted">
          Macro Name:
        </label>
        <div className="col-8">
          <input
            className={`form-control form-control-sm${
              nameError ? " is-invalid" : ""
            }`}
            disabled={isCreatingMacro}
            value={draftName}
            onChange={(e) => {
              setDraftName(e.target.value);
              setNameError(null);
            }}
            onBlur={handleNameBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          {nameError && <div className="invalid-feedback">{nameError}</div>}
        </div>
      </div>

      <div className="row g-2 align-items-start">
        <div className="col-4 col-form-label col-form-label-sm text-muted">
          Medications:
        </div>
        <div className="col-8">
          {orderedItems.length > 0 && (
            <DndContext
              sensors={sensors}
              onDragStart={({ active }) => setActiveId(active.id as string)}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveId(null)}
            >
              <SortableContext
                items={orderedItems.map((item) => item.medicationIdentifier)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="list-unstyled mb-0">
                  {orderedItems.map((item, index) => (
                    <SortableFavoriteItem
                      key={item.medicationIdentifier}
                      favorite={item}
                      dragHandleVisibility="enabled"
                      onRemove={() =>
                        removeItem({
                          path: {
                            macroId: resolvedMacroId!,
                            medicationId: item.medicationIdentifier,
                          },
                        })
                      }
                    />
                  ))}
                </ul>
              </SortableContext>
              <DragOverlay>
                {activeItem && (
                  <FavoriteItemContent
                    favorite={activeItem}
                    index={orderedItems.findIndex(
                      (i) =>
                        i.medicationIdentifier ===
                        activeItem.medicationIdentifier,
                    )}
                    dragHandleVisibility="enabled"
                    isDragOverlay
                  />
                )}
              </DragOverlay>
            </DndContext>
          )}

          {showAddSelect ? (
            <MedicationSelect
              inputId="macro-med-search"
              ref={selectRef}
              autoFocus
              options={medicationOptions}
              onChange={handleSelectMed}
            />
          ) : (
            <button
              className="btn btn-link p-0"
              style={{ fontSize: "0.85rem" }}
              onClick={() => {
                setShowAddSelect(true);
                setAddMedError(null);
              }}
            >
              Add medication
            </button>
          )}
          {addMedError && (
            <div className="text-danger mt-1" style={{ fontSize: "0.8rem" }}>
              {addMedError}
            </div>
          )}
          {itemsError && (
            <div className="text-danger mt-1" style={{ fontSize: "0.8rem" }}>
              {itemsError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
