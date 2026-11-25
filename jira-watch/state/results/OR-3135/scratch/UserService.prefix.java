package com.guided.orci.service;

import com.guided.orci.exceptions.UserNotFoundException;
import com.guided.orci.models.user.User;
import com.guided.orci.models.user.UserRole;
import com.guided.orci.repository.UserRepository;
import com.guided.orci.types.wrappers.TenantKey;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.Set;

@Service
@Slf4j
public class UserService {

    private UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Find a user with the given clientUserId with access to the given tenant org
     */
    public Optional<User> findUserByClientUserId(String clientUserId, TenantKey.Org org) {
        var users = this.userRepository.findByClientUserIdIgnoreCase(clientUserId)
                .stream()
                .filter(user -> user.getAllowedTenants().stream()
                        .anyMatch(tenant -> tenant.getOrg().equals(org)))
                .toList();
        if (users.size() > 1) {
            log.error("Multiple users with the same clientUserId {} in org {}", clientUserId, org);
            return Optional.empty();
        }
        if (users.isEmpty()) {
            return Optional.empty();
        }
        return Optional.ofNullable(users.getFirst());
    }

    @Transactional
    public User createOrGetUserByClientUserId(String clientUserId, TenantKey.Org org) {
        Optional<User> user = findUserByClientUserId(clientUserId, org);
        if (user.isEmpty()) {
            log.info("Creating new user: " + clientUserId);
            return this.userRepository.save(User.builder()
                    // try to avoid username collisions by combining clientUserId with the org
                    .username(clientUserId.toUpperCase() + ":" + org.getValue())
                    .clientUserId(clientUserId.toUpperCase())
                    .enabled(true)
                    .roles(Set.of(UserRole.ROLE_USER))
                    .build());
        }
        return user.orElseThrow();
    }


    public @NotNull User getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new UserNotFoundException();
        }

        var principal = authentication.getPrincipal();
        if (principal instanceof User user) {
            return user;
        }
        if (principal instanceof OidcUser oidcUser) {
            var sub = oidcUser.getSubject();
            // todo: cache me
            return userRepository.findByCognitoSub(sub).orElseThrow(UserNotFoundException::new);
        }
        throw new UserNotFoundException();
    }

    public Optional<User> getCurrentUserOptional() {
        try {
            return Optional.of(getCurrentUser());
        } catch (UserNotFoundException e) {
            return Optional.empty();
        }
    }

    public void save(User user) {
        this.userRepository.save(user);
    }
}
