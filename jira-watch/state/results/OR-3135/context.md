# OR-3135 — A disabled SSO user keeps a signed-in session after the SSO failure page

Status: Testing   Assignee: Ryan Ducharme

## Description

h3. Problem

When the identity provider confirms a user whose GuidedOR account is disabled, SSOAuthHandler.onAuthenticationSuccess redirects to /sso-response with the message "User is disabled". It does not end the session. Spring Security saves the authenticated OAuth2 token in the session before it calls the success handler, so the user stays signed in.

Later requests trust that session:

* The roles come from the token. userAuthoritiesMapper (SecurityConfiguration) grants ROLE_USER for every OIDC user and ROLE_ADMIN for the guided-admins Cognito group.
* UserService.getCurrentUser finds the user by Cognito sub and does not check isEnabled().

The same applies to the "Unable to determine tenant" branch for a user who already has a database row. That user keeps the allowed tenants that are stored in the row.

Result: after an admin disables a user in GuidedOR, the user can still use the app (and the admin APIs, if the user is in guided-admins) while Cognito accepts the user. The user sees "SSO authentication failed", then opens / and the app works.

The front-door spec (spec/features/front-door.md R12, R13) says that both cases are an SSO failure. The redirect-only behavior came with OR-2093 (support disabling a user).

h3. Code

* orci/src/main/java/com/guided/orci/web/auth/SSOAuthHandler.java: the isEnabled() branch and the empty-tenant branch only redirect.
* orci/src/main/java/com/guided/orci/service/UserService.java: getCurrentUser() does not check isEnabled().
* orci/src/main/java/com/guided/orci/configuration/SecurityConfiguration.java: userAuthoritiesMapper.

h3. Fix

# In both failure branches of SSOAuthHandler, end the session before the redirect (for example, SecurityContextLogoutHandler.logout(request, response, authentication)).
# Make getCurrentUser() reject a disabled user, so that a session that already exists stops when an admin disables the user.

h3. Acceptance

* After an SSO callback for a disabled user, /api/user/info answers 401 or 403.
* After an SSO callback for an existing user with no tenant group, /api/user/info answers 401 or 403.
* A user who is disabled while signed in gets 401 or 403 on the next request.
* Tests cover the three cases above.

## Comments (0)

(none)
