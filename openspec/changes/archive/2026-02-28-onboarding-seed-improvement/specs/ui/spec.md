# UI Specification

## Purpose

Define the visual formatting rules for DataTables across the dashboard to ensure readability and usability.

## Requirements

### Requirement: UUID Column Visibility

The system MUST NOT display raw UUID columns (specifically the `id` accessorKey) in any `DataTable` component intended for end-user interaction within the `/dashboard` routes.

#### Scenario: User views a list of records
- GIVEN the user navigates to `/dashboard/vehicles/fleet` (or any other list)
- WHEN the `DataTable` renders the columns
- THEN the UUID column MUST be completely hidden from the visible Table headers and cells.

### Requirement: Incremental Search Columns

The system MUST use human-readable identifier columns for the primary search filter in `DataTable` instances, rather than filtering by `id`.

#### Scenario: User searches a table
- GIVEN a `DataTable` is rendered with a search input
- WHEN the user types a query
- THEN the table MUST filter by a descriptive column (e.g., `licensePlate`, `description`, `name`, `email`) instead of `id`.
