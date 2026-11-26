import React, { useEffect, useState } from "react";
import axios from "axios";
import { DateTime } from "luxon";
import { Fact, FactList } from "../../../Admin/FactList";
import { SectionHeader } from "../../../SectionHeader";

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

  const gitSha = import.meta.env.VITE_GIT_SHA || "N/A";
  return (
    <div>
      <section className="admin-section">
        <SectionHeader title="Server" />
        <FactList>
          <Fact label="Git commit">
            <code>{gitHash}</code>
          </Fact>
          <Fact label="Build version">
            <code>{buildVersion}</code>
          </Fact>
          <Fact label="Build date" wide>
            <code>
              {DateTime.fromISO(buildDate).toLocaleString({
                dateStyle: "full",
                timeStyle: "short",
              })}
            </code>
          </Fact>
        </FactList>
      </section>
      <section className="admin-section">
        <SectionHeader title="Client" />
        <FactList>
          <Fact label="Git commit">
            <code>{gitSha}</code>
          </Fact>
        </FactList>
      </section>
    </div>
  );
}
