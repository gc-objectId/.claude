import type { Decorator } from "@storybook/react-vite";
import { AuthContext, AuthHook } from "../src/context/AuthContext";
import { TenantID } from "../src/types/identifiers";
import { User } from "../src/types/User";

const signedInUser: User = {
  roles: ["ROLE_ADMIN"],
  username: "admin@example.org",
  name: "Example Admin",
  sessionId: "storybook",
  allowedTenants: ["demo" as TenantID],
};

export const withSignedInUser: Decorator = (Story) => (
  <AuthContext.Provider value={{ user: signedInUser } as AuthHook}>
    <Story />
  </AuthContext.Provider>
);
