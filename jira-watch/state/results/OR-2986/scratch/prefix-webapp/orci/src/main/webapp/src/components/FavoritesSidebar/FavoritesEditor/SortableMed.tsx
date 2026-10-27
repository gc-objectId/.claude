import { GripVertical } from "react-bootstrap-icons";
import { ConfirmDeleteButton } from "../ConfirmDeleteButton";
import { CSS } from "@dnd-kit/utilities";
import { Skeleton } from "../../Skeleton";
import { FavoriteMedicationDto } from "@api";
import { useSortable } from "@dnd-kit/sortable";
import { getMedicationLabelStyle } from "../../../utils/medicationLabelStyle";

export type DragHandleVisibility = "enabled" | "disabled" | "hidden";

export function SortableFavoriteItem({
  favorite,
  dragHandleVisibility,
  onRemove,
}: {
  favorite: FavoriteMedicationDto;
  dragHandleVisibility: DragHandleVisibility;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    index,
    activeIndex,
  } = useSortable({ id: favorite.medicationIdentifier! });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  // while the user is dragging, adjust the underlying list
  // indices so that styles can still apply to the "first" element
  const apparentIndex = index === 1 && activeIndex === 0 ? 0 : index;
  return (
    <li ref={setNodeRef} style={style}>
      <FavoriteItemContent
        favorite={favorite}
        dragHandleVisibility={dragHandleVisibility}
        index={apparentIndex}
        dragHandleProps={{ ...attributes, ...listeners }}
        onRemove={onRemove}
      />
    </li>
  );
}

export function FavoriteItemContent({
  favorite,
  dragHandleVisibility,
  isDragOverlay = false,
  dragHandleProps,
  onRemove,
  index,
  includeBorder = true,
}: {
  favorite: FavoriteMedicationDto;
  dragHandleVisibility: DragHandleVisibility;
  isDragOverlay?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
  onRemove?: () => void;
  index?: number;
  includeBorder?: boolean;
}) {
  const iconStyle = !!favorite.colorLabelSettings
    ? getMedicationLabelStyle(favorite.colorLabelSettings, true)
    : {};

  const isLoading = favorite.id?.endsWith("--loading");

  return (
    <div
      className={
        "fav-item-row d-flex align-items-center gap-2 py-2" +
        (includeBorder
          ? " border-bottom " + (index === 0 ? " border-top" : "")
          : "")
      }
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
          cursor:
            dragHandleVisibility === "enabled"
              ? "grab"
              : dragHandleVisibility === "disabled"
              ? "not-allowed"
              : "default",
          color:
            dragHandleVisibility === "enabled"
              ? "#adb5bd"
              : dragHandleVisibility === "disabled"
              ? "#adb5bd55"
              : dragHandleVisibility === "hidden"
              ? "transparent"
              : "inherit",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          touchAction: "none",
          ...(dragHandleProps?.style || {}),
        }}
      >
        <GripVertical size={16} />
      </span>
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
      )}

      <span
        className="flex-grow-1 small text-truncate"
        title={isLoading ? undefined : favorite.medicationName}
      >
        {isLoading ? <Skeleton height="0.8em" /> : favorite.medicationName}
      </span>
      {onRemove && (
        <ConfirmDeleteButton
          className="fav-item-action-btn btn btn-link btn-sm p-0 "
          onDelete={onRemove}
          disabled={isLoading}
          title={`Remove ${favorite.medicationName}`}
        />
      )}
    </div>
  );
}
