import { EventTypeFilter, TimelineHook } from "./useTimeline";
import React, { InputHTMLAttributes, useEffect, useRef } from "react";
import { Dropdown } from "react-bootstrap";
import {
  cloneDeep,
  cloneDeepWith,
  get,
  isBoolean,
  set,
  sortBy,
  toPairsIn,
  valuesIn,
} from "lodash";

import { Filter } from "react-bootstrap-icons";
import { getIcon, TimelineEventIcon } from "./TimelineEventIcon";

const CustomToggle = React.forwardRef(({ children, onClick }: any, ref) => (
  <span
    className="pointer px-2"
    title="filter"
    role="button"
    ref={ref as any}
    onClick={(e) => {
      e.preventDefault();
      onClick(e);
    }}
  >
    <Filter />
  </span>
));
CustomToggle.displayName = "CustomToggle";

type FiltersProps = { timeline: TimelineHook };

export function Filters({ timeline }: FiltersProps) {
  const filterState = timeline.filter;

  return (
    <Dropdown className={"h-100 border-end"}>
      <Dropdown.Toggle
        as={CustomToggle}
        id="dropdown-custom-components"
      ></Dropdown.Toggle>
      <Dropdown.Menu>
        <FilterSubtreeView
          name="all events"
          node={filterState}
          path={[]}
          onCheck={(value, path) => {
            const node = get(filterState, path);
            if (isBoolean(node)) {
              // @ts-ignore
              timeline.setFilter(set(cloneDeep(filterState), path, value));
            } else {
              timeline.setFilter(
                recursivelySetChecked(filterState, path, value),
              );
            }
          }}
        />
      </Dropdown.Menu>
    </Dropdown>
  );
}

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  state: boolean | "indeterminate";
  onCheck: (checked: boolean) => void;
};

function Checkbox({ state, onCheck, ...props }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === "indeterminate";
    }
  }, [state]);

  return (
    <input
      {...props}
      ref={ref}
      type="checkbox"
      checked={isBoolean(state) ? state : false}
      onChange={(event) => onCheck(event.currentTarget.checked)}
    />
  );
}

type FilterSubtreeViewProps = {
  name: string;
  node: EventTypeFilter;
  path: string[];
  onCheck: (value: boolean, path: string[]) => void;
};

function FilterSubtreeView({
  name,
  node,
  path,
  onCheck,
}: FilterSubtreeViewProps) {
  const checkboxId = "filter-checkbox-" + path.join("/");
  return (
    <div className="ps-2 text-nowrap">
      {
        <div>
          <Checkbox
            id={checkboxId}
            state={
              isBoolean(node)
                ? node
                : allChildrenChecked(node)
                ? true
                : anyChildrenChecked(node)
                ? "indeterminate"
                : false
            }
            onCheck={(checked) => {
              onCheck(checked, path);
            }}
          />
          <label className="px-1" htmlFor={checkboxId}>
            <span className="me-1">
              <TimelineEventIcon icon={getIcon(path.join("/"))} />
            </span>
            {name}
          </label>
        </div>
      }

      {!isBoolean(node) &&
        sortBy(toPairsIn(node), (value) => value[0]).map(([key, value]) => (
          <div key={key}>
            <FilterSubtreeView
              name={key}
              node={value}
              path={[...path, key]}
              onCheck={onCheck}
            />
          </div>
        ))}
    </div>
  );
}

function recursivelySetChecked(
  node: EventTypeFilter,
  path: string[],
  checked: boolean,
): any {
  if (isBoolean(node)) return;
  const subTree = cloneDeepWith(
    path.length === 0 ? node : get(node, path),
    (subTree: EventTypeFilter): any => {
      if (isBoolean(subTree)) return checked;
    },
  );
  return path.length === 0 ? subTree : set(cloneDeep(node), path, subTree);
}

function allChildrenChecked(node: EventTypeFilter): boolean {
  return isBoolean(node)
    ? node
    : valuesIn(node).every((branch) => allChildrenChecked(branch));
}

function anyChildrenChecked(node: EventTypeFilter): boolean {
  return isBoolean(node)
    ? node
    : valuesIn(node).some((subTree) => allChildrenChecked(subTree));
}
