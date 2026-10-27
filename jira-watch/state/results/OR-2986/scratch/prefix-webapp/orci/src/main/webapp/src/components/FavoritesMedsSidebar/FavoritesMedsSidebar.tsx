import "./FavoritesMedsSidebar.scss";

import { useRef, useState } from "react";
import { X, StarFill, PencilFill } from "react-bootstrap-icons";
import { FavoritesEditModal } from "./FavoritesEditModal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getFavoritesOptions,
  getFavoritesQueryKey,
  removeFavoriteMutation,
} from "../../api/generated/@tanstack/react-query.gen";
import { FavoriteMedicationDto } from "../../api/generated/types.gen";
import { ColorLabelSetting } from "../../types/ColorLabelSetting";
import { getMedicationLabelStyle } from "../../utils/medicationLabelStyle";

interface FavoritesMedsSidebarProps {
  onMedicationSelect: (medicationIdentifier: string) => Promise<void>;
}

export function FavoritesMedsSidebar({
  onMedicationSelect,
}: FavoritesMedsSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery(getFavoritesOptions());

  const { mutate: removeFavorite } = useMutation({
    ...removeFavoriteMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getFavoritesQueryKey() });
    },
  });

  return (
    <div className="favorites-sidebar">
      <button
        className="favorites-sidebar__toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        title={isOpen ? "Close favorites" : "Open favorites"}
      >
        <StarFill size={14} />
        <span className="favorites-sidebar__toggle-label">Favs</span>
      </button>

      {isOpen && (
        <div className="favorites-sidebar__panel">
          <div className="favorites-sidebar__header">
            Favorite Medications
            <button
              className="favorites-sidebar__edit-btn"
              onClick={() => setIsEditModalOpen(true)}
              title="Edit favorites"
            >
              <PencilFill size={11} />
            </button>
          </div>
          <ul className="favorites-sidebar__list">
            {favorites.length === 0 && (
              <li className="favorites-sidebar__empty">
                No favorites added yet.
              </li>
            )}
            {favorites.map((fav) => (
              <FavoriteMedItem
                key={fav.id}
                favorite={fav}
                onSelect={() => onMedicationSelect(fav.medicationIdentifier!)}
                onRemove={() =>
                  removeFavorite({
                    path: { medicationId: fav.medicationIdentifier! },
                  })
                }
              />
            ))}
          </ul>
        </div>
      )}
      <FavoritesEditModal
        show={isEditModalOpen}
        onHide={() => setIsEditModalOpen(false)}
      />
    </div>
  );
}

function FavoriteMedItem({
  favorite,
  onSelect,
  onRemove,
}: {
  favorite: FavoriteMedicationDto;
  onSelect: () => void;
  onRemove: () => void;
}) {
  // colorLabelSettings will be a ColorLabelSetting object at runtime once the
  // backend is running; the generated type will update after `npm run generate:api`.
  const colorSetting = favorite.colorLabelSettings as unknown as
    | ColorLabelSetting
    | null
    | undefined;

  const iconStyle =
    colorSetting != null ? getMedicationLabelStyle(colorSetting, true) : {};

  const cooldownRef = useRef(false);
  const handleSelect = () => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => {
      cooldownRef.current = false;
    }, 1000);
    onSelect();
  };

  return (
    <li className="favorites-sidebar__item">
      <button className="favorites-sidebar__select-btn" onClick={handleSelect}>
        <div className="favorites-sidebar__med-icon" style={iconStyle} />
        <span
          className="favorites-sidebar__med-name"
          title={favorite.medicationName}
        >
          {favorite.medicationName}
        </span>
      </button>
      <button
        className="favorites-sidebar__remove-btn"
        onClick={onRemove}
        title={`Remove ${favorite.medicationName} from favorites`}
      >
        <X size={16} />
      </button>
    </li>
  );
}
