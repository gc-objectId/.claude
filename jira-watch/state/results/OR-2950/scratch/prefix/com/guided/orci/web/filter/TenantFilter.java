package com.guided.orci.web.filter;

import com.guided.orci.audit.service.AuditService;
import com.guided.orci.configuration.tenant.TenantConfigProperties;
import com.guided.orci.models.audit.AuditEvent;
import com.guided.orci.models.audit.AuditEventType;
import com.guided.orci.models.audit.AuditTargetType;
import com.guided.orci.models.user.User;
import com.guided.orci.multitenancy.context.TenantContextHolder;
import com.guided.orci.resolver.HttpRequestTenantResolver;
import com.guided.orci.service.TracingService;
import com.guided.orci.service.UserService;
import com.guided.orci.types.wrappers.TenantKey;
import io.micrometer.common.KeyValue;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jetbrains.annotations.NotNull;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.filter.ServerHttpObservationFilter;

import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;

import java.io.IOException;
import java.util.Optional;

/**
 * Attempts to extract the tenant identifier from the request.
 * Prioritize the request parameter and fallbacks to a request header.
 */
@Component
@Order(25)
public class TenantFilter extends OncePerRequestFilter {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(TenantFilter.class);
    private final HttpRequestTenantResolver httpRequestTenantResolver;
    private final UserService userService;
    private final TracingService tracingService;

    private final AuditService auditService;
    private final TenantConfigProperties tenantConfigProperties;

    public TenantFilter(HttpRequestTenantResolver httpHeaderTenantResolver, UserService userService, TracingService tracingService, AuditService auditService, TenantConfigProperties tenantConfigProperties) {
        this.httpRequestTenantResolver = httpHeaderTenantResolver;
        this.userService = userService;
        this.tracingService = tracingService;
        this.auditService = auditService;
        this.tenantConfigProperties = tenantConfigProperties;
    }

    private static boolean isMGHTenantImplicitEndpoint(HttpServletRequest request) {
        return request.getRequestURI().startsWith("/api/integration/mgh")
               || request.getRequestURI().startsWith("/api/v2/services/ReceiveOptimeNotification");
    }

    @Override
    @SuppressFBWarnings(value = "XSS_SERVLET", justification = "tenantKey is validated against hardcoded TenantKey allowlist via TenantKey.parse()")
    protected void doFilterInternal(@NotNull HttpServletRequest request,
                                    @NotNull HttpServletResponse response,
                                    @NotNull FilterChain filterChain) throws ServletException, IOException {
        Optional<TenantKey> maybeTenantKey = httpRequestTenantResolver.resolveTenantId(request);
        var maybeUser = userService.getCurrentUserOptional();

        if (maybeTenantKey.isPresent() && !tenantConfigProperties.isEnabled(maybeTenantKey.get())) {
            // Disabled tenants have no schema (Liquibase skips them), so we cannot proceed:
            // downstream filters would blow up trying to query tables that don't exist.
            // Reject before any DB access, and don't try to audit, the audit table isn't there either.
            // Body intentionally generic, do not confirm tenant validity/enablement to callers.
            log.warn("Rejecting request for disabled tenant {}", maybeTenantKey.get());
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            return;
        }

        if (maybeUser.isPresent() && maybeTenantKey.isPresent()) {
            User user = maybeUser.get();
            TenantKey tenantKey = maybeTenantKey.get();
            if (!user.canAccessTenant(tenantKey)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                log.warn("Tenant access error: user {} with allowed tenants {} does not have access to tenant {}",
                        user.getId(), user.getAllowedTenants(), tenantKey);
                response.getWriter().write(
                        "Tenant access error. User does not have access to tenant %s"
                                .formatted(tenantKey));
                TenantContextHolder.withTenant(tenantKey, () ->
                        auditService.audit(AuditEvent.builder()
                                .eventType(AuditEventType.TENANT_ACCESS_DENIED)
                                .author(user.getClientUserId())
                                .targetType(AuditTargetType.TENANT)
                                .target(tenantKey.value())
                                .build()));

                return;
            }
        }

        if (maybeTenantKey.isPresent()) {
            TenantContextHolder.setTenantId(maybeTenantKey.get());
            configureTraces(maybeTenantKey.get(), request);
        }

        tracingService.setAttribute(TracingService.Attributes.TENANT, TenantContextHolder.getTenant().value());

        try {
            filterChain.doFilter(request, response);
        } finally {
            clear();
        }
    }

    private void clear() {
        TenantContextHolder.clear();
    }

    public static void configureTraces(TenantKey tenantId, HttpServletRequest request) {
        ServerHttpObservationFilter.findObservationContext(request).ifPresent(context ->
                context.addHighCardinalityKeyValue(KeyValue.of("tenant.id", tenantId.value())));
    }
}
