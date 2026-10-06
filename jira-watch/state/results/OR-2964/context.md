# OR-2964 — Remove the Envers footprint (annotations, revision repositories, dependency) since auditing is disabled

Status: Testing   Assignee: Ryan Ducharme

## Description

hibernate.integration.envers.enabled is false in application.yml, yet 45 entities in orci-models carry @Audited, 34 repositories in orci-repositories extend RevisionRepository, DatabaseConfiguration uses EnversRevisionRepositoryFactoryBean, spring-data-envers is declared in three poms, and no code calls findRevisions or findLastChangeRevision. The _AUDIT suffix property is also dead.

Either turn auditing on deliberately (it needs the _AUDIT tables in every tenant schema) or remove the annotations, the RevisionRepository supertypes, the factory bean, the dependency, and the two properties. No runtime behavior changes with removal; it is a wide mechanical diff.

## Comments (0)

(none)
