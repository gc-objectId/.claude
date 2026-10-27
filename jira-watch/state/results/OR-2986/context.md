# OR-2986 — Loading state for medication selections

Status: Testing   Assignee: Ryan Ducharme

## Description

It's nice to have instant feedback when you perform an action. Right now, when selecting a medication we make the user wait until the request completes before we display the tab. Normally that happens pretty quickly, but it's still noticeable, and if there's any slowness serverside it can be confusing as to whether or not anything is even happening. To make the app feel more responsive, we can immediately show a blank “loading state” tab upon med selection (scan, macro, favorite, or via the dropdown)

## Comments (0)

(none)
