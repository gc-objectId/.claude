package com.guided.orci.web.auth;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.base.Strings;
import com.guided.orci.multitenancy.context.TenantContextHolder;
import com.guided.orci.context.UserContextHolder;
import com.guided.orci.exceptions.NotImplementedException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Slf4j
public class LoginController {
    @PostMapping("/api/login/check")
    public ResponseEntity<LoginResponse> loginCheck(
            HttpServletRequest request,
            Authentication authentication,
            @RequestParam("userId") String userId
    ) {
        var tenant = TenantContextHolder.getTenant();
        if (authentication != null && authentication.isAuthenticated()) {
            if (tenant.isMgb() && isUserIdMismatch(userId)) {
                return new ResponseEntity<>(new UserMismatchResponse(), HttpStatus.OK);
            }
            return new ResponseEntity<>(new AlreadyLoggedInResponse(), HttpStatus.OK);
        }

        // store the tenant key in the session so that when SSO completes (if we are doing SSO)
        // then we can figure out what tenant the user was originally requesting, so that we can emit an audit event.
        request.getSession().setAttribute(SSOAuthHandler.SESSION_TENANT_KEY, tenant.value());

        if (!tenant.isKnownTenant()) {
            throw new NotImplementedException("No login method configured for tenant: " + tenant.value());
        }
        // Login method follows the org: MGB uses the Epic launch flow, every other org uses Cognito
        // SSO. A new org must be given an explicit answer here, this switch won't compile without it.
        return switch (tenant.getOrg()) {
            case MGB -> new ResponseEntity<>(new MGBLoginResponse(), HttpStatus.OK);
            case DEMO, MAYO -> new ResponseEntity<>(new SSOLoginResponse("/oauth2/authorization/cognito"), HttpStatus.OK);
        };
    }

    private static boolean isUserIdMismatch(String userId) {
        return !Strings.isNullOrEmpty(userId) && !UserContextHolder.getClientUserId().equals(userId);
    }

    public static abstract class LoginResponse {
        @JsonProperty
        public abstract Boolean needsLogin();
    }

    public static class AlreadyLoggedInResponse extends LoginResponse {
        @Override
        public Boolean needsLogin() {
            return false;
        }
    }

    public static class UserMismatchResponse extends LoginResponse {
        @Override
        public Boolean needsLogin() {
            return false;
        }

        @JsonProperty
        public boolean isUserMismatch() {
            return true;
        }
    }

    public static class MGBLoginResponse extends LoginResponse {
        @JsonProperty
        public String strategy() {
            return "mgb";
        }

        @Override
        public Boolean needsLogin() {
            return true;
        }
    }

    public static class SSOLoginResponse extends LoginResponse {
        @JsonProperty
        public String strategy() {
            return "SSO";
        }

        @Override
        public Boolean needsLogin() {
            return true;
        }

        public SSOLoginResponse(String redirectUrl) {
            this.redirectUrl = redirectUrl;
        }

        public String redirectUrl;
    }
}
