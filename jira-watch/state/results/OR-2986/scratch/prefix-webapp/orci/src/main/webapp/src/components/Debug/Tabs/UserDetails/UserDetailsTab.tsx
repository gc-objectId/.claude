import React, { useEffect, useMemo } from "react";
import { useAuth } from "../../../../context/AuthContext";
import { Spinner } from "react-bootstrap";
import { isLoggedIn, LoadingUser, LoggedOutUser } from "../../../../types/User";
import { useFeatureFlags } from "../../../../hooks/useFeatureFlag";
import { isLoaded } from "../../../../types/Loadable";

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
    } else if (isLoggedIn(user)) {
      return (
        <div>
          <div>Username: {user.name}</div>
          <div>Roles: {user.roles.join(", ")}</div>
          <div>
            Session ID: <code>{user.sessionId}</code>
          </div>
          <div>
            <h4>Feature Flags</h4>
            <ul>
              {isLoaded(flags) && flags.map((it) => <li key={it}>{it}</li>)}
            </ul>
          </div>
        </div>
      );
    } else {
      throw "Invalid user";
    }
  }, [user]);

  return <div>{userState}</div>;
}
