# OR-2960 — Rule config cache never refreshes on the other node after an admin edit

Status: Testing   Assignee: Ryan Ducharme

## Description

RuleService keeps tenant rule configurations in a Guava LoadingCache built with expireAfterAccess(30s) (orci/src/main/java/com/guided/orci/service/rules/RuleService.java, constructor). saveStoredConfiguration writes the database and then updates only the local cache entry. Prod runs two ECS tasks. Event rules read configs on every evaluation, about 30 messages a second, so on the task that did not receive the admin edit the entry is never idle for 30 seconds and never reloads. A configuration change applies to half of the traffic until that task restarts.

Fix: expireAfterWrite(30s), so every node reloads within the window regardless of access pattern. Cross-node eviction via Redis is not needed at this change rate.

## Comments (0)

(none)
