import React, { useEffect, useMemo } from "react";
import { useAuth } from "../../../../context/AuthContext";
import { Spinner } from "react-bootstrap";
import {
  isLoggedIn,
  LoadingUser,
  LoggedOutUser,
  UserCheckFailed,
} from "../../../../types/User";
import { useFeatureFlags } from "../../../../hooks/useFeatureFlag";
import { isLoaded } from "../../../../types/Loadable";
import { Fact, FactList } from "../../../Admin/FactList";
import { SectionHeader } from "../../../SectionHeader";

import { logger } from "../../../../utils/logger";
export type UserDetailsProps = {
  isActive: boolean;
};

export function UserDetailsTab({ isActive }: UserDetailsProps) {
  const { user, refreshUser } = useAuth();

  const flags = useFeatureFlags();

  useEffect(() => {
    if (isActive) {
      logger.debug("refreshing user...");
      refreshUser().then((r) => logger.debug("user refreshed!", r));
    }
  }, [isActive, refreshUser]);

  const userState = useMemo(() => {
    if (user === LoadingUser) {
      return <Spinner />;
    } else if (user === LoggedOutUser) {
      return "Logged Out!";
    } else if (user === UserCheckFailed) {
      return "Sign-in check failed";
    } else if (isLoggedIn(user)) {
      return (
        <div>
          <section className="admin-section">
            <SectionHeader title="Signed in as" />
            <FactList>
              <Fact label="Username">{user.name}</Fact>
              <Fact label="Roles">{user.roles.join(", ")}</Fact>
              <Fact label="Session ID" wide>
                <code>{user.sessionId}</code>
              </Fact>
            </FactList>
          </section>
          <section className="admin-section">
            <SectionHeader title="Feature Flags" />
            <div className="admin-table__tags">
              {isLoaded(flags) &&
                flags.map((it) => (
                  <span key={it} className="guided-tag">
                    {it}
                  </span>
                ))}
            </div>
          </section>
        </div>
      );
    } else {
      throw "Invalid user";
    }
  }, [user, flags]);

  return <div>{userState}</div>;
}
