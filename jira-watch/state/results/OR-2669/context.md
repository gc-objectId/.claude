# OR-2669 — RecordNotFoundException: Unable to find practitioner with PERID: 1434

Status: Testing   Assignee: Ryan Ducharme

## Description

Sentry Issue: [ORCI-MONOLITH-FE|https://guided-clinical-solutions.sentry.io/issues/7620460223/?referrer=jira_integration]

{code}
RecordNotFoundException: Unable to find practitioner with PERID: 1434
    at com.guided.orci.integration.mayo.commands.MayoGetPractitionerR4Command.execute(MayoGetPractitionerR4Command.java:40)
    at com.guided.orci.integration.mayo.MayoCommandFactory.lambda$searchPractitioner$0(MayoCommandFactory.java:70)
    at com.guided.orci.service.PractitionerRefreshService.refreshPractitioner(PractitionerRefreshService.java:82)
    at com.guided.orci.service.PractitionerRefreshService.lambda$refreshPractitionerAsync$0(PractitionerRefreshService.java:50)
    at com.guided.orci.multitenancy.context.TenantContextHolder.withTenant(TenantContextHolder.java:38)
...
(13 additional frame(s) were not displayed)
{code}

## Comments (0)

(none)
