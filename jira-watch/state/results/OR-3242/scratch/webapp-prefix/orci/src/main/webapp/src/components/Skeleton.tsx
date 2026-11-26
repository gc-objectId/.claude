import "./Skeleton.scss";

export function Skeleton({
  width,
  height = "1em",
}: {
  width?: string | number;
  height?: string | number;
}) {
  return (
    <div className="skeleton" style={{ width: width ?? "100%", height }} />
  );
}
