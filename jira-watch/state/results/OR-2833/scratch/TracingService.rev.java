package com.guided.orci.service;

import com.guided.orci.service.metrics.OrciCounter;
import com.guided.orci.service.metrics.OrciGauge;
import com.guided.orci.service.metrics.OrciMeterRegistry;
import com.guided.orci.service.metrics.OrciTimer;
import io.micrometer.core.instrument.MeterRegistry;
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;


import org.springframework.beans.factory.ObjectProvider;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.util.function.Supplier;

@Service
public class TracingService {
    private static final String instrumentationScopeName = "app";
    private final Tracer tracer;
    private final MeterRegistry registry;
    private volatile Meters meters;

    public TracingService(ObjectProvider<Tracer> tracerProvider, MeterRegistry meterRegistry) {
        this.tracer = tracerProvider.getIfAvailable(
                () -> GlobalOpenTelemetry.getTracer(instrumentationScopeName)
        );
        this.registry = meterRegistry;
    }

    public void withSpan(String spanName, @Nullable Context parent, Runnable runnable) {
        withSpan(spanName, parent, () -> {
            runnable.run();
            return null;
        });
    }

    public void withSpan(String spanName, Runnable runnable) {
        withSpan(spanName, null, runnable);
    }

    public <T> T withSpan(String spanName, Supplier<T> supplier) {
        return withSpan(spanName, Context.current(), supplier);
    }

    public <T> T withSpan(String spanName, @Nullable Context parent, Supplier<T> supplier) {
        var builder = tracer.spanBuilder(spanName);
        if (parent != null) {
            builder.setParent(parent);
        }
        var newSpan = builder.startSpan();
        try (Scope ignored = newSpan.makeCurrent()) {
            return supplier.get();
        } catch (Exception e) {
            newSpan.recordException(e);
            throw e;
        } finally {
            newSpan.end();
        }
    }

    public <T> T withSpanNonDiscardable(String spanName, Supplier<T> supplier) {
        Context context = Context.current();
        return withSpan(spanName, context, () -> {
            setNotDiscardable();
            return supplier.get();
        });
    }

    public void setAttribute(String attributeName, String attributeValue) {
        Span.current().setAttribute(attributeName, attributeValue);
    }

    public void setNotDiscardable() {
        Span.current().setAttribute("co.elastic.discardable", false);
    }

    public Meters getMeters() {
        Meters currentMeters = meters;
        if (currentMeters != null) {
            return currentMeters;
        }
        // prevent double initialization
        synchronized (this) {
            if (meters == null) {
                meters = new Meters(registry);
            }
            return meters;
        }
    }

    public static class Meters {
                private final OrciCounter timerJobError;
                private final OrciCounter timerJobComplete;
                private final OrciCounter timerJobStart;
                private final OrciCounter hl7MessageEnqueued;
                private final OrciCounter hl7MessageSentDirectly;
                private final OrciGauge patientInfoInFlightCurrent;
                private final OrciGauge patientInfoInFlightQueue;

        private final OrciMeterRegistry registry;

        public Meters(MeterRegistry meterRegistry) {
            this.registry = new OrciMeterRegistry(meterRegistry);
            timerJobStart = registry.counter("orci.timer.job.start");
            timerJobComplete = registry.counter("orci.timer.job.complete");
            timerJobError = registry.counter("orci.timer.job.error");
            hl7MessageEnqueued = registry.counter("orci.hl7.message.enqueued");
            hl7MessageSentDirectly = registry.counter("orci.hl7.message.sent.directly");
            patientInfoInFlightCurrent = registry.gauge("orci.patient-info-retrieval.inflight.current");
            patientInfoInFlightQueue = registry.gauge("orci.patient-info-retrieval.inflight.queue");
        }

        public OrciCounter getTimerJobError() { return timerJobError; }
        public OrciCounter getTimerJobComplete() { return timerJobComplete; }
        public OrciCounter getTimerJobStart() { return timerJobStart; }
        public OrciCounter getHl7MessageEnqueued() { return hl7MessageEnqueued; }
        public OrciCounter getHl7MessageSentDirectly() { return hl7MessageSentDirectly; }
        public OrciGauge getPatientInfoInFlightCurrent() { return patientInfoInFlightCurrent; }
        public OrciGauge getPatientInfoInFlightQueue() { return patientInfoInFlightQueue; }

        public OrciTimer getRuleExecutionTimer(String ruleId) {
            return registry.timer("orci.rule.exec", "orci_rule_id", ruleId);
        }

        public OrciTimer getIncomingEventTimer(String tenant, String eventType, String displayName) {
            return registry.timer("orci.event.incoming",
                    "tenant", tenant,
                    "orci_event_type", eventType,
                    "orci_display_name", displayName);
        }

        public OrciTimer getPatientInfoRetrievalStepTimer(String stepName) {
            return registry.timer("orci.patient-info-retrieval.step",
                    "step_name", stepName);
        }

        public OrciTimer getPatientInfoInFlightWaitTimer(String tenant, String outcome) {
            return registry.timer("orci.patient-info-retrieval.inflight.wait", "tenant", tenant, "outcome", outcome);
        }

        public OrciCounter getPatientInfoInFlightRejectedCounter(String tenant, String reason) {
            return registry.counter("orci.patient-info-retrieval.inflight.rejected", "tenant", tenant, "reason", reason);
        }

        public OrciTimer getPatientInfoRetrievalTotalTimer(String tenant, String outcome) {
            return registry.timer("orci.patient-info-retrieval.total", "tenant", tenant, "outcome", outcome);
        }

        public OrciTimer getAppLaunchTimer(String tenant, String outcome) {
            return registry.timer("orci.app-launch.total", "tenant", tenant, "outcome", outcome);
        }

        public OrciCounter getCaseLaunchCounter(String mode, boolean isCaseLauncher) {
            return registry.counter("orci.case.launch",
                    "mode", mode,
                    "case_launcher", String.valueOf(isCaseLauncher));
        }

        public OrciTimer getMedicationSelectionTimer(String selectionMethod, String outcome) {
            return registry.timer("orci.medication-selection.total",
                    "selection_method", selectionMethod,
                    "outcome", outcome);
        }

        public OrciTimer getMedicationSelectionPhaseTimer(String selectionMethod) {
            return registry.timer("orci.medication-selection.selection",
                    "selection_method", selectionMethod);
        }

        public OrciTimer getMedicationSelectionEvaluationTimer() {
            return registry.timer("orci.medication-selection.rule-evaluation");
        }

        public OrciCounter getMedicationSelectionRejectedCounter(String selectionMethod, String reason) {
            return registry.counter("orci.medication-selection.rejected",
                    "selection_method", selectionMethod,
                    "reason", reason);
        }

        public OrciCounter getUserBarcodeMappingUsedCounter() {
            return registry.counter("orci.medication-selection.user-barcode-mapping.used");
        }
    }

    public static class Attributes {
        public static String TENANT = "tenant";
    }
}
