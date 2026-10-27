import { useState } from "react";
import Footer from "./Footer";

export type ExpandableTextProps = {
  content: string;
  limit: number;
};
const ExpandableText = ({ content, limit }: ExpandableTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  const truncatedContent =
    content.length > limit ? content.substring(0, limit) + "..." : content;

  return (
    <div>
      {isExpanded ? content : truncatedContent}
      {content.length > limit && (
        <small
          onClick={toggleExpansion}
          style={{ marginLeft: "5px", cursor: "pointer" }}
        >
          {isExpanded ? "Show less" : "Show more"}
        </small>
      )}
    </div>
  );
};

export default ExpandableText;
