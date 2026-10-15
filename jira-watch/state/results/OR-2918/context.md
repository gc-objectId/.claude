# OR-2918 — NoSuchElementException

Status: Testing   Assignee: Ryan Ducharme

## Description

*Sentry Issue:* [ORCI-MONOLITH-HQ|https://guided-clinical-solutions.sentry.io/issues/7724625030/]

{code:java}
NoSuchElementException
    at com.guided.orci.engine.rule.event.ERASAntiemeticsRule.createPrompt(ERASAntiemeticsRule.java:155)
    at com.guided.orci.engine.rule.event.ERASAntiemeticsRule.evaluate(ERASAntiemeticsRule.java:103)
    at com.guided.orci.engine.rule.event.ERASAntiemeticsRule.evaluate(ERASAntiemeticsRule.java:30)
    at com.guided.orci.engine.EventBasedRule.apply(EventBasedRule.java:40)
    at com.guided.orci.engine.EventBasedRule.apply(EventBasedRule.java:14)
    at com.guided.orci.engine.RuleEngine.lambda$evaluateRules$1(RuleEngine.java:72)
    at com.guided.orci.service.TracingService.lambda$withSpanNonDiscardable$2(TracingService.java:71)
    at com.guided.orci.service.TracingService.withSpan(TracingService.java:58)
    at com.guided.orci.service.TracingService.withSpanNonDiscardable(TracingService.java:69)
    at com.guided.orci.engine.RuleEngine.lambda$evaluateRules$2(RuleEngine.java:71)
    at com.guided.orci.service.metrics.OrciTimer.lambda$record$0(OrciTimer.java:70)
    at com.guided.orci.service.metrics.OrciTimer.record(OrciTimer.java:56)
    at com.guided.orci.service.metrics.OrciTimer.record(OrciTimer.java:69)
    at com.guided.orci.engine.RuleEngine.lambda$evaluateRules$3(RuleEngine.java:63)
    at com.guided.orci.service.TracingService.lambda$withSpan$1(TracingService.java:38)
{code}

*Environment:* guidedor.guidedclinical.com (production)
*First seen:* 2026-09-10T17:38:46.158000Z  ·  *Occurrences:* 1

*Crash site:* {{orci/src/main/java/com/guided/orci/engine/rule/event/ERASAntiemeticsRule.java:155}}
{code}
f4e3d86174  Jordan Ephron  2023-05-31
                         + antiemeticClass.get() +
{code}

*Recent history:*
- 3c3c74b0b Merge branch 'main' into OR-2451-eras-antiemetics
- 161c2d78a OR-2584: fix duplicate rule alerts from concurrent PROCEDURE_START events
- c3ae6e258 OR-2451 - ERAs  antiemetic compliance
- 95ff06809 OR-2311 - Fix ERAS antiemetics rule failing to persist with non-serializable IMedication
- 7424fc97a 'Reject Suggestion' -> 'Reject'

*Related PR:* [OR-158 - Add ERAS Antiemetics rule|https://github.com/guidedclinical/orci/pull/300]

## Comments (0)

(none)
