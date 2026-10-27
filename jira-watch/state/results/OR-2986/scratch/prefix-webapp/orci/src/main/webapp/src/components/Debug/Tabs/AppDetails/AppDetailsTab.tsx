import React, { useEffect, useState } from "react";
import axios from "axios";
import { DateTime } from "luxon";

export type AppDetailsProps = {
  isActive: boolean;
};

export function AppDetailsTab({ isActive }: AppDetailsProps) {
  const [gitHash, setGitHash] = useState("");
  const [buildVersion, setBuildVersion] = useState("");
  const [buildDate, setBuildDate] = useState("");
  useEffect(() => {
    if (isActive) {
      axios
        .get("/actuator/info")
        .then((response) => {
          setGitHash(response.data.git.commit.id);
          setBuildVersion(response.data.build.version);
          setBuildDate(response.data.build.time);
        })
        .catch((error) => {});
    }
  }, [isActive]);

  const gitSha = import.meta.env.VITE_GIT_SHA
    ? import.meta.env.VITE_GIT_SHA
    : process.env.REACT_APP_GIT_SHA || "N/A";
  return (
    <div>
      <h3>Server</h3>
      <div>
        Git commit: <code>{gitHash}</code>
      </div>
      <div>
        Build version: <code>{buildVersion}</code>
      </div>
      <div>
        Build date:{" "}
        <code>
          {DateTime.fromISO(buildDate).toLocaleString({
            dateStyle: "full",
            timeStyle: "short",
          })}
        </code>
      </div>
      <hr />
      <h3>Client</h3>
      <div>
        Git commit: <code>{gitSha}</code>
      </div>
    </div>
  );
}
