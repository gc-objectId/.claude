# OR-3242 — Keep the tenant on admin patient page launch and debugger links

Status: Testing   Assignee: Ryan Ducharme

## Description

h2. Problem

A demo-demo launch from the admin patient page failed in stage. The Launch link and the debugger link carried client_id=null, so the request reached the server with no tenant.

h2. Current behavior

* ViewPatient.tsx and OperationTab.tsx read the tenant from the URL once, when the bundle loads, not when the page renders.
* Open the app on the home page (no client_id), pick Patients for a tenant (an in-app link, no reload), open a patient: the Launch, debugger, breadcrumb and create-case calls all use tenant null.
* The debugger page then fails with relation "operations" does not exist, because the query runs without a tenant schema.
* /app-launch fails because /api/login/check throws a NullPointerException in TenantKey.getOrg when the tenant is empty and the user is signed in.

h2. Desired behavior

* The admin patient page and the debugger operation tab use the tenant of the current page, however the user got there.
* /api/login/check with no known tenant returns a clear error, not a server crash.

h2. Affected

Admin patient page, debugger operation tab, app launch login check. All tenants, all environments.

## Comments (0)

(none)
