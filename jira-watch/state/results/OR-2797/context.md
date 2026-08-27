# OR-2797 — InternalErrorException: HTTP 500 Internal Server Error

Status: Testing   Assignee: Ryan Ducharme

## Description

Sentry Issue: [ORCI-MONOLITH-GK|https://guided-clinical-solutions.sentry.io/issues/7673601155/?referrer=jira_integration]

{code}
InternalErrorException: HTTP 500 Internal Server Error
    at ca.uhn.fhir.rest.server.exceptions.BaseServerResponseException.newInstance(BaseServerResponseException.java:317)
    at ca.uhn.fhir.rest.client.impl.BaseClient.invokeClient(BaseClient.java:415)
    at ca.uhn.fhir.rest.client.impl.BaseClient.fetchResourceFromUrl(BaseClient.java:161)
    at com.guided.orci.integration.fhir.FhirClient.getResource(FhirClient.java:72)
    at com.guided.orci.integration.fhir.FhirClient.getR4Bundle(FhirClient.java:88)
...
(24 additional frame(s) were not displayed)
{code}

## Comments (0)

(none)
