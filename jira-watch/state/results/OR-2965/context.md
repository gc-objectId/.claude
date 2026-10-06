# OR-2965 — Resolve duplicate jakarta.mail implementations on the classpath

Status: Testing   Assignee: Ryan Ducharme

## Description

orci/pom.xml declares com.sun.mail:jakarta.mail:2.0.2 (about line 764) and a pinned jakarta.mail:jakarta.mail-api:2.1.5 (about line 753) beside the Angus implementation that spring-boot-starter-mail brings in. Two implementations of the same jakarta.mail packages are on the classpath and which one loads depends on classpath order.

Consumers: InternalNotificationService (jakarta.mail.internet.MimeMessage) and the logback SMTPAppender used by the OpenShift EMAIL appender in logback-spring.xml. Remove the com.sun.mail artifact and the API pin, keep the Boot-managed Angus version, and verify the OpenShift email path still sends. Consider moving the SMTP host and recipients out of logback-spring.xml into properties at the same time.

## Comments (0)

(none)
