import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { LoggedOutUser } from "../types/User";

export function DevModeBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);

  const initialize = useCallback(async () => {
    const response = await axios.get(
      `/api/is-prod?host=${encodeURI(location.host)}`,
    );
    setShow(!response.data);
  }, []);
  useEffect(() => {
    initialize();
  }, []);

  return (
    <>
      {show && (
        <div
          style={{
            display: dismissed ? "none" : "block",
            background:
              "linear-gradient(90deg, rgba(255,73,73,1) 0%, rgba(255,216,15,1) 50%, rgba(255,73,73,1) 100%)",
            height: "4px",
            cursor: "pointer",
          }}
          title="running in development environment"
          onClick={() => setDismissed(true)}
        ></div>
      )}
    </>
  );
}
