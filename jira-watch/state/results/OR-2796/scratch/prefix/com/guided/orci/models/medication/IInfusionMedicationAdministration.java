package com.guided.orci.models.medication;

import com.google.common.collect.Range;
import com.google.common.collect.RangeMap;
import com.google.common.collect.TreeRangeMap;
import com.guided.orci.types.Dose;
import com.guided.orci.types.PediatricStatus;
import com.guided.orci.units.Units;
import com.guided.orci.utils.DateUtils;
import com.guided.orci.utils.Result;
import com.guided.orci.utils.TimebaseProvider;
import org.apache.commons.lang3.ObjectUtils;
import org.jetbrains.annotations.NotNull;
import org.springframework.data.util.Pair;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import javax.measure.Quantity;
import javax.measure.Unit;
import javax.measure.quantity.Time;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Stream;

import tech.units.indriya.unit.ProductUnit;

import static com.google.common.collect.Streams.forEachPair;

public interface IInfusionMedicationAdministration extends IMedicationAdministration {

    Comparator<InfusionEvent> INFUSION_EVENTS_ORDERED_CHRONOLOGICALLY = Comparator.comparing(InfusionEvent::getEventDate, Comparator.nullsFirst(Comparator.naturalOrder()));


    Comparator<IInfusionMedicationAdministration> INFUSION_MEDICATION_ADMINISTRATION_ORDERED_BY_LATEST_FIRST =
            Comparator.<IInfusionMedicationAdministration, Date>comparing(medAdmin -> medAdmin.getInfusionEvents().stream()
                                    .filter(InfusionEvent::hasActivity)
                                    .map(InfusionEvent::getEventDate)
                                    .filter(Objects::nonNull)
                                    .max(Date::compareTo)
                                    .orElse(null),
                            Comparator.nullsFirst(Comparator.naturalOrder()))
                    .thenComparing(IInfusionMedicationAdministration::getCreatedDate, Comparator.nullsFirst(Comparator.naturalOrder()))
                    .reversed();


    /**
     * Comparator that filters for the specified eventType - this orders administrations in descending order (reverse chronological order)
     * @param eventType
     * @return
     */
    static Comparator<IInfusionMedicationAdministration> generateChronologicalComparatorWithEventType(InfusionEventType eventType) {
        Comparator<Date> nullFirstNaturalOrder = Comparator.nullsFirst(Comparator.naturalOrder());

        Comparator<Instant> nullFirstInstantOrder = Comparator.nullsFirst(Comparator.naturalOrder());

        return Comparator.<IInfusionMedicationAdministration, Date>comparing(medAdmin ->
                                getLatestEventDateForType(medAdmin, eventType),
                        nullFirstNaturalOrder)
                .thenComparing(IInfusionMedicationAdministration::getCreatedDate, nullFirstInstantOrder)
                .reversed();
    }

    private static Date getLatestEventDateForType(IInfusionMedicationAdministration medAdmin, InfusionEventType eventType) {
        if (medAdmin == null || medAdmin.getInfusionEvents() == null) {
            return null;
        }
        return medAdmin.getInfusionEvents().stream()
                .filter(Objects::nonNull)
                .filter(event -> eventType.equals(event.getEventType()))
                .map(InfusionEvent::getEventDate)
                .filter(Objects::nonNull)
                .max(Date::compareTo)
                .orElse(null);
    }


    /**
     * The events which make up this infusion.
     * Warning: the order of these events is undefined.
     * Sort before using if order matters!
     */
    List<InfusionEvent> getInfusionEvents();

    default boolean matchesInfusionEvents(InfusionMedicationAdministration other) {

        boolean medMatch = getMedicationIdentifier() != null && getMedicationIdentifier().equals(other.medicationIdentifier);
        boolean infusionEventMatch = getInfusionEvents().stream().anyMatch(infusionEvent -> other.getInfusionEvents().stream().anyMatch(infusionEvent::matchesEvent));

        return medMatch && infusionEventMatch;
    }

    /**
     * This implementation returns the date of the latest infusion event that has activity
     */
    default Date getLatestEventDate() {
        if (getInfusionEvents() == null) {
            return null;
        }
        return getInfusionEvents().stream()
                .filter(InfusionEvent::hasActivity)
                .max(INFUSION_EVENTS_ORDERED_CHRONOLOGICALLY)
                .map(InfusionEvent::getEventDate)
                .orElse(null);
    }

    default Optional<InfusionEvent> getFirstStartOrRateChangeInfusionEvent() {
        if (getInfusionEvents() == null) {
            return Optional.empty();
        }
        return getInfusionEvents().stream()
                .filter(infusionEvent -> InfusionEventType.START.equals(infusionEvent.eventType) || InfusionEventType.RATE_CHANGE.equals(infusionEvent.eventType))
                .min(INFUSION_EVENTS_ORDERED_CHRONOLOGICALLY);
    }

    /**
     * For an infusion this method could have multiple interpretations.
     * However, we're choosing to say that an infusion is 'administered' during a given range
     * if there is any span in which the rate or dose is non-zero overlapping the given range.
     *
     * @param start the earliest time to include (inclusive)
     * @param end   the latest time to include (inclusive)
     * @return whether there is any > 0 rate in the given range
     */
    default boolean isAdministeredBetween(Date start, Date end) {
        return hasCalculatedActivityBetween(start, end);
    }


    /**
     * Infusions can be started multiple times within a timeframe.
     * This method just checks if it was started any point in the timeframe
     */
    @Override
    default boolean isStartedBetween(Date start, Date end) {
        return hasEventBetween(InfusionEventType.START, start, end);
    }

    default boolean isStoppedBetween(Date start, Date end) {
        return hasEventBetween(InfusionEventType.STOP, start, end);
    }


    /**
     * Infusions can describe a stream of infusion events. We filter to 7 days worth of events and then
     * build a map of ranges to determine if any of the ranges include medication activity (any documented non-zero rate/dose value)
     * @param start
     * @param end
     * @return
     */
    @Override
    default boolean hasCalculatedActivityBetween(Date start, Date end) {
        // pad one ms on either end of the range, so that if the given start/end date
        // is exactly the start/end of this infusion's range, then it will still overlap
        Range<Instant> range = Range.open(
                start.toInstant().minusMillis(1),
                end.toInstant().plusMillis(1));

        return toRangeMap().subRangeMap(range).asMapOfRanges().values().stream().anyMatch(InfusionEvent::hasActivity);
    }

    /**
     * Returns true if there was any documented activity (any documented non-zero rate/dose value) during the period of time
     * @param start
     * @param end
     * @return
     */
    default boolean hasDocumentedActivityBetween(Date start, Date end) {
        var events = getInfusionEvents(start, end);
        return events.anyMatch(InfusionEvent::hasActivity);
    }

    default boolean hasEventBetween(InfusionEventType eventType, Date start, Date end) {
        return hasEventBetween(Set.of(eventType), start, end);
    }

    default boolean hasEventBetween(Set<InfusionEventType> eventTypes, Date start, Date end) {
        return getInfusionEvents().stream().anyMatch(event -> event.eventType != null && eventTypes.contains(event.eventType) && DateUtils.isDateBetween(event.getEventDate(), start, end));
    }

    default Optional<InfusionEvent> getLatestInfusionEvent(InfusionEventType eventType) {
        if (eventType == null) {
            return Optional.empty();
        }
        return getLatestInfusionEvent(Set.of(eventType));
    }

    default Optional<InfusionEvent> getLatestInfusionEvent(Set<InfusionEventType> eventTypes) {
        return getInfusionEvents().stream().filter(infusionEvent -> eventTypes.contains(infusionEvent.eventType)).max(INFUSION_EVENTS_ORDERED_CHRONOLOGICALLY);
    }

    default Optional<InfusionEvent> getLatestInfusionEventWithActivity() {
        return getInfusionEvents().stream().filter(InfusionEvent::hasActivity).max(INFUSION_EVENTS_ORDERED_CHRONOLOGICALLY);
    }

    /**
     * Returns the infusion event which begins at precisely `instant`.
     * We assume there should only be one event at X. If there are more, we're nondeterministic.
     *
     * @param instant the exact time at which time to search for an event
     * @return the infusion at time X.
     */
    default Optional<InfusionEvent> getInfusionEventAtTime(@Nonnull Instant instant) {
        return getInfusionEvents().stream().filter(event -> instant.equals(event.getEventDate().toInstant())).findAny();
    }

    default boolean hasEventOn(@Nonnull Instant date) {
        return getInfusionEvents().stream().anyMatch(event -> date.equals(event.getEventDate().toInstant()));
    }


    default boolean hasEventOnOrAfter(InfusionEventType eventType, @Nonnull Instant date) {
        return getInfusionEvents().stream().anyMatch(event -> eventType.equals(event.eventType) && (event.getEventDate().toInstant().equals(date) || event.getEventDate().toInstant().isAfter(date)));
    }

    default boolean hasEventBefore(InfusionEventType eventType, @Nonnull Instant date) {
        return getInfusionEvents().stream().anyMatch(event -> eventType.equals(event.eventType) && event.getEventDate().toInstant().isBefore(date));
    }

    default Optional<InfusionEvent> getMostRecentEvent(InfusionEventType eventType) {
        return getMostRecentEvent(Set.of(eventType));
    }

    default Optional<InfusionEvent> getMostRecentEvent(Set<InfusionEventType> eventTypes) {
        if (eventTypes.isEmpty()) {
            return Optional.empty();
        }
        return getInfusionEvents().stream()
                .filter(it -> it.eventType != null && eventTypes.contains(it.eventType))
                .max(INFUSION_EVENTS_ORDERED_CHRONOLOGICALLY);
    }

    default Optional<Pair<Date, Optional<Date>>> getDateRange() {
        var min = getInfusionEvents().stream()
                .filter(it -> it.eventType == InfusionEventType.START)
                .min(Comparator.comparing(infusionEvent -> infusionEvent.eventDate));
        var max = getInfusionEvents().stream()
                .filter(it -> it.eventType == InfusionEventType.STOP)
                .max(Comparator.comparing(infusionEvent -> infusionEvent.eventDate));
        if (min.isPresent() && !min.get().equals(max.orElse(null))) {
            return Optional.of(Pair.of(min.get().eventDate, max.map(it -> it.eventDate)));
        } else if (min.isPresent()) {
            return Optional.of(Pair.of(min.get().eventDate, Optional.empty()));
        } else {
            return Optional.empty();
        }
    }

    /**
     * Returns the date this infusion was first started.
     * Infusions can be started/stopped multiple times, so there is some nuance here.
     */
    default Optional<Date> getFirstStartDate() {
        return getFirstStartOrRateChangeInfusionEvent().map(InfusionEvent::getEventDate);
    }

    @Override
    default @Nullable Date getStartOfAdministrationDate() {
        return getFirstStartDate().orElse(null);
    }

    @Override
    default @Nullable Date getEndOfAdministrationDate() {
        return getStoppedDate().orElse(null);
    }

    @Override
    default MedicationRouteQualifier getRouteQualifier() {
        return MedicationRouteQualifier.INFUSION;
    }

    /**
     * @deprecated determining if an infusion is ongoing should always be qualified by a time range
     * @see #isOngoing(Date, Date)
     */
    default boolean isOngoing() {
        return isOngoing(null);
    }


    default boolean isOngoing(@Nullable Date startDate) {
        return isOngoing(startDate, (Date) null);
    }

    default boolean isOngoing(@Nullable Date startDate, TimebaseProvider provider) {
        return isOngoing(startDate, provider.getTimebase());
    }

    /**
     * This method returns true if there is activity prior to the end date with no subsequent stop event (implying the patient is still on this infusion)
     * @param startDate
     * @param endDate
     * @return true if there is activity prior to the end date with no subsequent stop event (implying the patient is still on this infusion).
     */
    default boolean isOngoing(@Nullable Date startDate, @Nullable Date endDate) {
        var events = getInfusionEvents(startDate, endDate);
        return hasActivityWithNoStop(events.toList());
    }

    /**
     * Returns a filtered list of infusion events based on date
     * @param startDate
     * @param endDate
     * @return
     */
    private Stream<InfusionEvent> getInfusionEvents(@Nullable Date startDate, @Nullable Date endDate) {
        var events = getInfusionEvents().stream();
        if(startDate != null) {
            events = events.filter(event -> event.eventDate != null && (startDate.before(event.eventDate) || startDate.equals(event.eventDate)));
        }
        if(endDate != null) {
            events = events.filter(event -> event.eventDate != null && (endDate.after(event.eventDate) || endDate.equals(event.eventDate)));
        }
        return events;
    }

    /**
     * Ongoing infusions are defined as having activity (non-zero rate or dose) and no stop event (or the stop event is before the latest activity)
     *
     * @param events
     * @return true if the infusion is still ongoing, false otherwise
     */
    private boolean hasActivityWithNoStop(List<InfusionEvent> events) {
        Date mostRecentActivity = null;
        Date mostRecentStop = null;
        // doing this instead of just checking if the last event is STOP because we
        // could have additional unknown events later in the stream
        for (InfusionEvent infusionEvent : events) {
            if (infusionEvent.hasActivity())
                mostRecentActivity = ObjectUtils.max(mostRecentActivity, infusionEvent.getEventDate());
            if (infusionEvent.eventType == InfusionEventType.STOP)
                mostRecentStop = ObjectUtils.max(mostRecentStop, infusionEvent.getEventDate());
        }
        return mostRecentActivity != null &&
               (mostRecentStop == null || mostRecentStop.toInstant().isBefore(mostRecentActivity.toInstant()));
    }

    default boolean isStopped() {
        return !isOngoing(null, (Date) null);
    }
    default boolean isStopped(Date endDate) {
        return !isOngoing(null, endDate);
    }

    default Optional<Date> getStoppedDate() {
        return getMostRecentEvent(InfusionEventType.STOP).map(InfusionEvent::getEventDate);
    }

    /**
     * Returns the most recent non-zero rate. This method looks at both the rate and dose of the infusion events. If the dose has rate-like unit, it will consider that as the rate of the administration
     *
     * @return
     */
    default Optional<Rate> getMostRecentNonZeroRate() {
        return getInfusionEvents().stream()
                .sorted(INFUSION_EVENTS_ORDERED_CHRONOLOGICALLY.reversed())
                .filter(infusionEvent -> (infusionEvent.rate != null && infusionEvent.rate.rateAmount().compareTo(BigDecimal.ZERO) != 0) ||
                                         (infusionEvent.dose != null && infusionEvent.dose.getUnit().contains("/") && infusionEvent.dose.getValue().compareTo(BigDecimal.ZERO) != 0))
                .map(event -> {
                    if (event.rate != null) {
                        return event.getRate();
                    }
                    return new Rate(event.getDose().getValue(), Units.parseUnit(event.getDose().getUnit()));
                })
                .findFirst();
    }

    /**
     * Attempts to calculate the administered dose of this infusion in
     * the specified time window [start, stop] (both bounds inclusive)
     * <p>
     * Does not use the InfusionEvents `dose` fields, instead relies
     * on our medication's concentration values and the calculated infusion volume
     * <p>
     * This means that this will only work if we have linked the infusion
     * to a med in our formulary that has a concentration set
     * <p>
     * TODO: can we figure out what infusion event's `dose` field means
     *  and use that instead of relying on our med's concentration?
     */
    @Override
    default Result<String, Dose> calculateDoseByCategory(String medicationCategory, PediatricStatus pediatricStatus, Instant start, Instant stop) {
        if (getMedication().isEmpty()) {
            return Result.error("Missing medication for med admin " + getMedicationIdentifier());
        }
        var medication = getMedication().get();

        if (!isMultiComponentMedication() && !hasMedicationCategory(medicationCategory)) {
            return Result.error("Medication category " + medicationCategory + " not found for " + getMedicationIdentifier());
        }
        if (isMultiComponentMedication() && medication.getMedicationComponentsByCategory(medicationCategory).isEmpty()) {
            return Result.error("Medication category " + medicationCategory + " not found in any component of " + getMedicationIdentifier());
        }

        var administeredVolume = calculateAdministeredVolumeInTimeRange(start, stop);
        if (administeredVolume.isError()) {
            return Result.error(administeredVolume.getError());
        }

        if (isMultiComponentMedication()) {
            var calculatedDose = calculateCompoundDose(administeredVolume.getOk(), pediatricStatus);
            if (calculatedDose.isEmpty()) {
                return Result.error("Unable to calculate compound dose for " + getMedicationIdentifier());
            }
            if (!(calculatedDose.get() instanceof Dose.CompoundDose compoundDose)) {
                // failed to calculate the compound dose
                return Result.error("Tried to calculate compound dose for " + getMedicationIdentifier() + ", but result was " + calculatedDose.get());
            }

            var relevantComponents = medication.getMedicationComponentsByCategory(medicationCategory);
            if (relevantComponents.size() > 1) {
                // this shouldn't happen
                return Result.error("Multiple components found for category " + medicationCategory + " in " + getMedicationIdentifier());
            }
            if (relevantComponents.isEmpty()) {
                return Result.error("No components found for category " + medicationCategory + " in " + getMedicationIdentifier());
            }
            var relevantComponent = relevantComponents.getFirst();
            var relevantMedId = relevantComponent.getComponent().getMedicationIdentifier();
            var componentDose = compoundDose.componentDoses().get(relevantMedId);
            if (componentDose == null) {
                return Result.error("No dose found for component " + relevantMedId + " in compound dose for " + getMedicationIdentifier());
            }
            return Result.ok(componentDose);
        } else {
            // single component
            if (hasSingleConcentration()) {
                var concentrationQuantity = getSingleConcentration().asQuantity();
                if (concentrationQuantity.isPresent()) {
                    Optional<Dose> calculatedDose = Dose.of(administeredVolume.getOk().quantity().multiply(concentrationQuantity.get()));
                    if (calculatedDose.isEmpty()) {
                        return Result.error("Unable to calculate dose for " + getMedicationIdentifier());
                    }
                    return Result.ok(calculatedDose.get());
                } else {
                    return Result.error("Invalid concentration for med " + getMedicationIdentifier() + ": " + getSingleConcentration());
                }
            }

            if(getConcentrations().isEmpty()){
                // No concentration available; fall back to integrating the documented dose rate (e.g. Units/hr)
                var calculatedDose = calculateAdministeredDoseInTimeRange(start, stop);
                if (calculatedDose.isPresent()) {
                    return Result.ok(calculatedDose.get());
                }
            }

            return Result.error("No single concentration for med " + getMedicationIdentifier() + " and unable to derive dose from infusion event doses");
        }
    }

    /**
     * Calculate the volume of this infusion administered between 'start' and 'stop' (both inclusive).
     *
     * <pre>
     *           v infusion events
     * s ---- x ---- s ---- r ---- x
     *    |--------------------|
     *           ^ range [start, stop]
     * s: start
     * x: stop
     * r: rate-change
     * </pre>
     * <p>
     * Each infusion event's rate is summed over duration of each segment in the window, and the result is returned.
     * Assumes rates are specified in volume/time
     * Assumes start is before stop
     * Returns error if any event is unmapped
     */
    default Result<String, Dose.VolumeBasedDose> calculateAdministeredVolumeInTimeRange(Instant start, Instant stop) {
        assert start.isBefore(stop);

        var rangeMap = toRangeMap();

        var targetRange = Range.closed(start, stop);

        try {
            var quantity = rangeMap.subRangeMap(targetRange).asMapOfRanges().entrySet().stream().map(entry -> {
                var rate = entry.getValue().getRate();

                if (rate == null) {
                    // Some infusion events do not specify a rate, only a dose.
                    //      If we have an event which changes the dose without changing the rate,
                    //      we cannot safely calculate a volume since we don't know what happened to the rate.
                    throw new RuntimeException("Not attempting to calculate volume due to infusion event with null rate");
                }

                var range = entry.getKey();
                var duration = Duration.between(range.lowerEndpoint(), range.upperEndpoint());
                var concentration = hasSingleConcentration() ? getSingleConcentration().asQuantity().orElseThrow() : null;
                return rate.multiply(duration, concentration);
            }).reduce(Quantity::add);

            if (quantity.isEmpty()) {
                return Result.ok(new Dose.VolumeBasedDose(Units.getQuantity(0, Units.MILLILITER)));
            }

            return Result.ok(new Dose.VolumeBasedDose(quantity.get()));
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

    /**
     * Calculate administered dose by integrating the infusion event dose rates over time.
     * Only used when concentration-based calculation is unavailable.
     */
    default Optional<Dose> calculateAdministeredDoseInTimeRange(Instant start, Instant stop) {
        assert start.isBefore(stop);

        var rangeMap = toRangeMap();

        var targetRange = Range.closed(start, stop);

        try {
            var quantity = rangeMap.subRangeMap(targetRange).asMapOfRanges().entrySet().stream().map(entry -> {
                var dose = entry.getValue().getDose();

                if (dose == null) {
                    throw new RuntimeException("Not attempting to calculate dose due to infusion event with null dose");
                }

                var range = entry.getKey();
                var duration = Duration.between(range.lowerEndpoint(), range.upperEndpoint());
                var timeUnit = getTimeUnitInDenominator(dose.quantity().getUnit())
                        .orElseThrow(() -> new RuntimeException("Infusion event dose unit %s is not time-based".formatted(dose.getUnit())));
                var durationQuantity = Units.getQuantity(duration).to(timeUnit);
                return dose.quantity().multiply(durationQuantity);
            }).reduce(Quantity::add);

            if (quantity.isEmpty()) {
                return Optional.empty();
            }

            return Dose.of(quantity.get());
        } catch (RuntimeException e) {
            return Optional.empty();
        }
    }

    private static Optional<Unit<Time>> getTimeUnitInDenominator(Unit<?> unit) {
        if (unit instanceof ProductUnit<?> productUnit) {
            for (int i = 0; i < productUnit.getUnitCount(); i++) {
                var partUnit = productUnit.getUnit(i);
                var pow = productUnit.getUnitPow(i);
                if (pow < 0 && partUnit.isCompatible(Units.HOUR)) {
                    return Optional.of(partUnit.asType(Time.class));
                }
            }
        }

        if (unit.isCompatible(Units.HOUR)) {
            return Optional.of(unit.asType(Time.class));
        }

        return Optional.empty();
    }

    default @NotNull RangeMap<Instant, InfusionEvent> toRangeMap() {
        return toRangeMap(Date.from(Instant.now().minus(Duration.ofDays(7))));
    }
    /**
     * Creates a RangeMap mapping each infusion event's time-range to the event itself.
     * Each Range is inclusive at the start and exclusive at the end.
     * The full span of the RangeMap is [firstEventStartDate, +∞)
     *
     * @param cutoff start date of the ranges to consider - If there was a start event
     */
    default @NotNull RangeMap<Instant, InfusionEvent> toRangeMap(Date cutoff) {
        RangeMap<Instant, InfusionEvent> rangeMap = TreeRangeMap.create();


        // infusion events of interest sorted chronologcally
        var infusionEvents = getInfusionEvents().stream()
                .filter(event -> event.isMappedAndNonIgnored() && event.getEventDate() != null && (cutoff == null ||  cutoff.before(event.getEventDate())))
                .sorted(INFUSION_EVENTS_ORDERED_CHRONOLOGICALLY)
                .toList();

        if (infusionEvents.isEmpty()) {
            return rangeMap;
        }

        // If the first event is not a START or RATE_CHANGE event, but still has a rate set, then include it.
        //      This handles the occasional infusion which begins with one or more 'Rate/Dose Verify' events
        //      (we think these are infusions which might be continued from another order)
        var firstEvent = getInfusionEvents().stream().filter(event -> event.getEventDate() != null && (cutoff == null || cutoff.before(event.getEventDate()))).min(INFUSION_EVENTS_ORDERED_CHRONOLOGICALLY).orElseThrow();
        if (firstEvent.eventType != InfusionEventType.START && firstEvent.eventType != InfusionEventType.RATE_CHANGE
            && firstEvent.hasActivity()) {
            infusionEvents = new ArrayList<>(infusionEvents);
            infusionEvents.addFirst(firstEvent);
        }

        forEachPair(infusionEvents.stream(), infusionEvents.stream().skip(1), (first, second) -> {
            var range = Range.closedOpen(first.getEventDate().toInstant(), second.getEventDate().toInstant());
            rangeMap.put(range, first);
        });
        // last event continues to infinity
        InfusionEvent last = infusionEvents.getLast();
        rangeMap.put(Range.atLeast(last.getEventDate().toInstant()), last);

        return rangeMap;
    }
}
