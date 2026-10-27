import React, { useState } from "react";
import { Trash } from "react-bootstrap-icons";

export function ConfirmDeleteButton({
  onDelete,
  disabled,
  className,
  style,
  title,
}: {
  onDelete: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <button
      className={className + " confirm-delete-button"}
      disabled={disabled}
      style={
        confirming
          ? { ...style, visibility: "visible", textDecoration: "none" }
          : style
      }
      title={confirming ? undefined : title}
      onClick={() => {
        if (confirming) {
          onDelete();
        } else {
          setConfirming(true);
        }
      }}
      onMouseLeave={() => setConfirming(false)}
    >
      {confirming ? (
        <span
          style={{
            color: "#dc3545",
            fontSize: "0.75rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          delete?
        </span>
      ) : (
        <Trash size={16} />
      )}
    </button>
  );
}
