import { Table, TableProps } from "react-bootstrap";
import "./AdminTable.scss";

export function AdminTable({ className, ...props }: TableProps) {
  return (
    <Table
      hover
      responsive
      {...props}
      className={["admin-table", className].filter(Boolean).join(" ")}
    />
  );
}
