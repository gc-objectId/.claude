# OR-2842 — Hide the launch-by-operation redirect from the OpenAPI spec

Status: Testing   Assignee: Ryan Ducharme

## Description

GET /api/launch-by-operation/{operationId} declares Spring's RedirectView as its return type. springdoc treats a concrete return type on a @RestController method as a response schema, so it introspects RedirectView and walks the getApplicationContext() getter it inherits from ApplicationObjectSupport. The Spring container is then expanded into the published spec, and from there the environment, the classloader chain and the whole servlet container surface.

Measured against the regenerated client: 21 types across 592 lines. ApplicationContext, ApplicationContextWritable, AutowireCapableBeanFactory, BeanFactory, Environment, RedirectView, RedirectViewWritable, ServletContext, ServletContextWritable, ServletRegistration, FilterRegistration, SessionCookieConfig, HttpStatus, HttpStatusCode, DefaultHttpStatusCode, JspConfigDescriptor, JspPropertyGroupDescriptor, TaglibDescriptor, and the three LaunchByOperationId request and response types.

The documented contract is wrong rather than leaky. RedirectView implements Spring's View, so Spring MVC resolves it through the view layer instead of a message converter. The endpoint answers with a 302 to /app-launch and never serializes a body, so no container detail goes over the wire. What is wrong is that the spec, and every client generated from it, claim the endpoint returns a JSON object describing the Spring container.

The endpoint has no typed caller. Its only consumer is handleCopyLaunchLink in orci/src/main/webapp/src/components/Debug/Tabs/Operation/OperationTab.tsx, which builds the URL as a string and copies it to the clipboard for a human to paste into a browser. A browser-navigation redirect does not belong in a typed JSON client.

h3. Delivered

* @Hidden on AppLaunchController.launchByOperationId, matching the convention already used on JwkSetController
* The regenerated TypeScript client, a pure removal of 592 lines with no insertions

h3. Verified

The live spec no longer lists the path or any of the schemas. Typecheck passes, nothing in src referenced any removed type, and the branded id surface is untouched at 13 brand constants, 13 aliases and 86 branded path parameters.

h3. Note

A repo-wide springdoc filter excluding ApplicationContext or RedirectView was rejected. It would hide the symptom everywhere and let the next controller returning a Spring View publish a bogus response schema unnoticed. The method signature is the defect.

## Comments (0)

(none)
