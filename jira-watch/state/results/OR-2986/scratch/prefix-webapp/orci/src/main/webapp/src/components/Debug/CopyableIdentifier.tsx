import { useCopyToClipboard } from "@uidotdev/usehooks";
import { useHotkeys } from "react-hotkeys-hook";
import * as uuid from "uuid";
import { Ref, useState } from "react";

/**
 * A component which displays an identifier which when clicked gets copied to the clipboard
 * Contains special handling for UUIDs, they are displayed truncated.
 */
export function CopyableIdentifier({
  value,
}: {
  value: string | null | undefined;
}) {
  const [_, copyToClipboard] = useCopyToClipboard();
  const [isFocused, setIsFocused] = useState(false);
  const divRef = useHotkeys(
    "meta+c, ctrl+c",
    () => {
      if (value) copyToClipboard(value);
    },
    { preventDefault: true, enabled: isFocused },
    [value, copyToClipboard, isFocused],
  );

  const handleClick = () => {
    if (divRef.current) {
      const range = document.createRange();
      range.selectNodeContents(divRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  if (!value) {
    return <span></span>;
  }

  return (
    <code
      tabIndex={-1}
      ref={divRef as Ref<HTMLElement>}
      title={value}
      onClick={handleClick}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {uuid.validate(value) ? value.substring(36 - 7) : value}
    </code>
  );
}
