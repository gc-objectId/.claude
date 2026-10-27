import "./FavoritesSidebar.scss";

import React, { forwardRef, useEffect, useRef, useState } from "react";
import { PencilFill, StarFill } from "react-bootstrap-icons";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";
import { FavoritesEditModal } from "./FavoritesEditor/FavoritesEditModal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getFavoritesOptions,
  getFavoritesQueryKey,
  getMacrosOptions,
  removeFavoriteMutation,
} from "@api/@tanstack/react-query.gen";
import {
  FavoriteMedicationDto,
  MedicationMacroDto,
  MedicationMacroItemDto,
} from "@api";
import { getMedicationLabelStyle } from "../../utils/medicationLabelStyle";
import { OverlayTrigger, Popover } from "react-bootstrap";
import { useResizable } from "./useResizable";
import { useCooldown } from "./useCooldown";
import { Skeleton } from "../Skeleton";
import toast from "react-hot-toast";
import { FavoriteItemContent } from "./FavoritesEditor/SortableMed";
import { FeatureKeyEnum, useFeatureFlag } from "../../hooks/useFeatureFlag";
import { useAppQueryParams } from "../../hooks/hooks";
import { useTrackingEvent } from "../../hooks/useTrackingEvent";
import { EventType } from "../../services/TrackingEventService";

const MED_SELECTION_COOLDOWN_MS = 1000;

interface FavoritesMedsSidebarProps {
  onMedicationSelect: (
    medicationIdentifier: string,
    options?: { skipAudio?: boolean },
  ) => Promise<void>;
  onMacroSelect: (items: MedicationMacroItemDto[]) => Promise<void>;
}

export const FavoritesSidebar = forwardRef<
  HTMLDivElement,
  FavoritesMedsSidebarProps
>(function FavoritesSidebar({ onMedicationSelect, onMacroSelect }, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { patientId, caseId } = useAppQueryParams();
  const { recordEvent } = useTrackingEvent(patientId, caseId);

  const {
    handleResizeMouseDown,
    size: panelWidth,
    isResizing: resizingSidebar,
  } = useResizable({
    storageKey: "favorites-sidebar-width",
    minSize: 180,
    maxSize: Math.floor(window.innerWidth * 0.33),
    defaultSize: 240,
    direction: "horizontal",
  });

  const macrosEnabled = useFeatureFlag(FeatureKeyEnum.MEDICATION_MACROS);

  const { data: favorites = [] } = useQuery(getFavoritesOptions());
  const { data: macros = [] } = useQuery(getMacrosOptions());

  const { mutate: removeFavorite } = useMutation({
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
      return { previousFavorites };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(
        getFavoritesQueryKey(),
        context?.previousFavorites,
      );
      toast.error("Failed to remove favorite");
      console.error(err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getFavoritesQueryKey() });
    },
  });

  return (
    <>
      <div style={{ position: "absolute" }} />
      <div className="favorites-sidebar" ref={ref}>
        <button
          className="favorites-sidebar__toggle"
          onClick={() =>
            setIsOpen((prev) => {
              recordEvent(
                prev
                  ? EventType.FAVORITES_SIDEBAR_COLLAPSED
                  : EventType.FAVORITES_SIDEBAR_EXPANDED,
              );
              return !prev;
            })
          }
          title={isOpen ? "Close favorites" : "Open favorites"}
        >
          <StarFill size={14} />
          <span className="favorites-sidebar__toggle-label">Favs</span>
        </button>

        {isOpen && (
          <div
            className="favorites-sidebar__panel"
            style={{
              width: panelWidth,
              maxWidth: Math.floor(window.innerWidth * 0.33),
            }}
          >
            <div
              className={
                "favorites-sidebar__resize-handle" +
                (resizingSidebar ? " dragging" : "")
              }
              onMouseDown={handleResizeMouseDown}
            />
            <div className="favorites-sidebar__header">
              Medications
              <button
                className="favorites-sidebar__edit-btn btn btn-link btn-sm p-0 text-secondary"
                onClick={() => setIsEditModalOpen(true)}
                title="Edit medications"
              >
                <PencilFill size={11} />
              </button>
            </div>
            {macrosEnabled && macros.some((m) => m.active) && (
              <div className="favorites-sidebar__macros-section">
                <div className="favorites-sidebar__section-header">Macros</div>
                <ul className="favorites-sidebar__list">
                  {macros
                    .filter((m) => m.active)
                    .map((macro, index) => (
                      <MacroSidebarItem
                        key={macro.id}
                        macro={macro}
                        onSelect={() => {
                          recordEvent(EventType.FAVORITES_MACRO_SELECTED, {
                            macroName: macro.name,
                            macroId: macro.id,
                            positionInList: index,
                          });
                          onMacroSelect(macro.items);
                        }}
                      />
                    ))}
                </ul>
              </div>
            )}
            {macrosEnabled && macros.some((m) => m.active) && (
              <hr className="my-0" />
            )}
            <div className="favorites-sidebar__favorites-section">
              <div className="favorites-sidebar__section-header">
                Favorite Medications
              </div>
              <ul className="favorites-sidebar__list">
                {favorites.length === 0 && (
                  <li className="favorites-sidebar__empty">
                    No favorites added yet.
                  </li>
                )}
                {favorites.map((fav, index) => (
                  <FavoriteMedSidebarItem
                    key={fav.id}
                    favorite={fav}
                    onSelect={() => {
                      recordEvent(EventType.FAVORITES_MEDICATION_SELECTED, {
                        medicationName: fav.medicationName,
                        medicationIdentifier: fav.medicationIdentifier,
                        positionInList: index,
                      });
                      onMedicationSelect(fav.medicationIdentifier!);
                    }}
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
            </div>
          </div>
        )}
        <FavoritesEditModal
          show={isEditModalOpen}
          onHide={() => setIsEditModalOpen(false)}
        />
      </div>
    </>
  );
});

function MacroSidebarItem({
  macro,
  onSelect,
}: {
  macro: MedicationMacroDto;
  onSelect: () => void;
}) {
  const handleSelect = useCooldown(onSelect, MED_SELECTION_COOLDOWN_MS);
  const ref = useRef<HTMLElement | null>();
  useEffect(() => {
    ref.current = document.getElementById("popover-root");
  }, []);

  return (
    <li className="favorites-sidebar__item">
      <OverlayTrigger
        placement="left"
        delay={{ show: 800, hide: 100 }}
        container={ref.current}
        overlay={
          <Popover>
            <Popover.Header>{macro.name}</Popover.Header>
            <Popover.Body>
              {macro.items.map((item, index) => (
                <FavoriteItemContent
                  key={item.id}
                  index={index}
                  favorite={item}
                  dragHandleVisibility="hidden"
                  dragHandleProps={{ style: { display: "none" } }}
                  includeBorder={false}
                />
              ))}
            </Popover.Body>
          </Popover>
        }
      >
        <button
          className="favorites-sidebar__macro-select-btn"
          onClick={() => handleSelect()}
          tabIndex={-1}
        >
          <span className="favorites-sidebar__macro-name" title={macro.name}>
            {macro.name}
          </span>
        </button>
      </OverlayTrigger>
    </li>
  );
}

function FavoriteMedSidebarItem({
  favorite,
  onSelect,
  onRemove,
}: {
  favorite: FavoriteMedicationDto;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const iconStyle = !!favorite.colorLabelSettings
    ? getMedicationLabelStyle(favorite.colorLabelSettings, true)
    : {};

  const handleSelect = useCooldown(onSelect, MED_SELECTION_COOLDOWN_MS);
  const isLoading = favorite.id?.endsWith("--loading");

  return (
    <li className="favorites-sidebar__item">
      <button
        className="favorites-sidebar__select-btn"
        onClick={() => handleSelect()}
        tabIndex={-1}
      >
        {isLoading ? (
          <div
            style={{
              width: 15,
              height: 20,
              flexShrink: 0,
            }}
          >
            <Skeleton height="20px" width="15px" />
          </div>
        ) : (
          <div className="favorites-sidebar__med-icon" style={iconStyle} />
        )}
        <span
          className="favorites-sidebar__med-name"
          title={isLoading ? undefined : favorite.medicationName}
        >
          {isLoading ? <Skeleton height="0.8em" /> : favorite.medicationName}
        </span>
      </button>
      <ConfirmDeleteButton
        className="favorites-sidebar__remove-btn btn btn-link btn-sm p-0"
        disabled={isLoading}
        onDelete={onRemove}
        title={`Remove ${favorite.medicationName} from favorites`}
      />
    </li>
  );
}
