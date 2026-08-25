# OR-2677 — InvalidDataAccessApiUsageException: No active transaction

Status: Testing   Assignee: Ryan Ducharme

## Description

Sentry Issue: [ORCI-MONOLITH-FF|https://guided-clinical-solutions.sentry.io/issues/7623000381/?referrer=jira_integration]

{code}
TransactionRequiredException: No active transaction
    at com.guided.orci.service.EventService.lambda$handleEventCategoryEvent$2(EventService.java:307)
    at com.guided.orci.service.EventService.handleEventCategoryEvent(EventService.java:305)
    at com.guided.orci.service.EventService.handleEvent(EventService.java:135)
    at com.guided.orci.service.hl7.DefaultHL7ProcessingContext$5.lambda$afterCommit$0(DefaultHL7ProcessingContext.java:465)
    at com.guided.orci.service.hl7.DefaultHL7ProcessingContext$5.afterCommit(DefaultHL7ProcessingContext.java:464)
...
(36 additional frame(s) were not displayed)

InvalidDataAccessApiUsageException: No active transaction
    at com.guided.orci.service.EventService.lambda$handleEventCategoryEvent$2(EventService.java:307)
    at com.guided.orci.service.EventService.handleEventCategoryEvent(EventService.java:305)
    at com.guided.orci.service.EventService.handleEvent(EventService.java:135)
    at com.guided.orci.service.hl7.DefaultHL7ProcessingContext$5.lambda$afterCommit$0(DefaultHL7ProcessingContext.java:465)
    at com.guided.orci.service.hl7.DefaultHL7ProcessingContext$5.afterCommit(DefaultHL7ProcessingContext.java:464)
...
(35 additional frame(s) were not displayed)

HL7 processor MayoHL7OruProcessor failed for type=ORU^R01 tenant=mayo-mayo message id=019f8116-b534-76ce-8a2f-73ed83ce3818
{code}

## Comments (0)

(none)
