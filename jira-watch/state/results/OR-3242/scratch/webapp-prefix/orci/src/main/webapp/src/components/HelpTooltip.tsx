import { forwardRef } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { ChevronDown, ChevronUp } from "react-bootstrap-icons";
import "./HelpTooltip.scss";

const Toggle = forwardRef(({ children, onClick, ...props }: any, ref: any) => {
  const isOpen = props["aria-expanded"];
  return (
    <div
      ref={ref}
      className="pointer not-selectable"
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
    >
      Help
      {isOpen ? (
        <ChevronUp className="ms-1" />
      ) : (
        <ChevronDown className="ms-1" />
      )}
      {children}
    </div>
  );
});
Toggle.displayName = "Toggle";

export const HelpTooltip = ({
  showFeedbackForm,
  rightOffset = 0,
}: {
  showFeedbackForm: () => void;
  rightOffset?: number;
}) => {
  return (
    <div
      style={{
        position: "fixed",
        top: "30px",
        right: `${30 + rightOffset}px`,
      }}
      className="help-tooltip-dropdown-container"
    >
      <Dropdown>
        <Dropdown.Toggle as={Toggle} />
        <Dropdown.Menu>
          <Dropdown.Item
            eventKey="1"
            className="d-flex align-items-center"
            href="/protected-static/GuidedOR FAQs.pdf"
            target="_blank"
          >
            FAQs
          </Dropdown.Item>
          <Dropdown.Item
            eventKey="2"
            className="d-flex align-items-center"
            href="/protected-static/GuidedOR User Guide.pdf"
            target="_blank"
          >
            User Guide
          </Dropdown.Item>
          <Dropdown.Item
            eventKey="2"
            className="d-flex align-items-center"
            onClick={showFeedbackForm}
          >
            Give Feedback
          </Dropdown.Item>
          <hr />
          <Dropdown.Item
            disabled
            eventKey="3"
            className="d-flex align-items-center"
          >
            Vocera &quot;GuidedOR Help&quot;
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};
