# Calendar — Right-Click Context Menu (New Domain)

## Purpose

Define the right-click interaction on `MaintenanceCalendar` day cells that allows users to create a Work Order scheduled on that day.

---

## Requirements

### Requirement: Day Cell Right-Click Context Menu

The `MaintenanceCalendar` MUST intercept `contextmenu` events on day cells.

The browser's native context menu MUST be suppressed (`preventDefault`).

A custom context menu MUST appear near the cursor position.

The context menu MUST contain at minimum the option: "Nueva OT en este día".

The context menu MUST close when the user clicks outside it or presses Escape.

#### Scenario: Right-click on a day with no events

- GIVEN the calendar is rendered
- AND a day cell has no scheduled items
- WHEN the user right-clicks the day cell
- THEN the native browser menu MUST NOT appear
- AND a custom context menu MUST appear with "Nueva OT en este día"

#### Scenario: Right-click on a day with existing events

- GIVEN a day cell has one or more scheduled items
- WHEN the user right-clicks the day cell
- THEN the custom context menu MUST appear (same behavior regardless of existing events)

#### Scenario: Dismiss context menu

- GIVEN the context menu is visible
- WHEN the user clicks outside the menu OR presses Escape
- THEN the context menu MUST close
- AND MUST NOT open the dialog

#### Scenario: Select "Nueva OT en este día"

- GIVEN the context menu is visible for day 15 of the current month
- WHEN the user clicks "Nueva OT en este día"
- THEN the context menu MUST close
- AND `QuickCreateWorkOrderDialog` MUST open with `defaultDate` set to that day (YYYY-MM-DD format)

#### Scenario: Right-click on empty calendar padding cell

- GIVEN a padding cell (null day, before the 1st of month)
- WHEN the user right-clicks it
- THEN the custom context menu MUST NOT appear
- AND the native browser menu MAY appear (no preventDefault on null cells)
