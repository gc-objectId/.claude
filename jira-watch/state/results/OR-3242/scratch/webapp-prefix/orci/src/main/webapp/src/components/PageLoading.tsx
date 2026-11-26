import { Spinner } from "react-bootstrap";

export function PageLoading() {
  return (
    <div className="guided-page guided-page--loading">
      <Spinner animation="border" role="status">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );
}
