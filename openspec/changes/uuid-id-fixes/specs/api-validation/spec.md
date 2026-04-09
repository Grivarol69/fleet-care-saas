# API Validation Specification

## Purpose

Define how API routes MUST validate UUID ID fields received as query parameters or request body fields. After the UUID migration, several API routes apply `parseInt()` to query parameters (turning UUID strings into `NaN` before passing them to Prisma) or use numeric comparison guards (`id <= 0`) that are dead code when IDs are strings. This spec mandates correct string-based validation for all UUID fields in the API layer.

## Requirements

### Requirement: API Query Parameters for UUID Fields MUST Be Read as Strings

API route handlers that read entity ID values from URL query parameters MUST use the raw string value directly. They MUST NOT apply `parseInt()` to any query parameter that is expected to be a UUID.

#### Scenario: Knowledge Base API filters by mantItemId

- GIVEN a GET request to `/api/maintenance/vehicle-parts?mantItemId=a1b2c3d4-e5f6-...`
- WHEN the route handler reads `searchParams.get("mantItemId")`
- THEN the raw UUID string `"a1b2c3d4-e5f6-..."` MUST be passed directly as the Prisma filter value
- AND the Prisma query `where: { mantItemId: "a1b2c3d4-e5f6-..." }` MUST execute and return matching records

#### Scenario: parseInt applied to mantItemId query parameter

- GIVEN a GET request to `/api/maintenance/vehicle-parts?mantItemId=a1b2c3d4-e5f6-...`
- WHEN the route handler applies `parseInt(searchParams.get("mantItemId"))`
- THEN the result is `NaN`
- AND the Prisma query `where: { mantItemId: NaN }` returns zero results regardless of database content
- THEREFORE `parseInt()` MUST NOT be applied to `mantItemId`, `vehicleBrandId`, or `vehicleLineId` query parameters in the vehicle-parts route

#### Scenario: Knowledge Base API returns filtered results for valid query

- GIVEN the global Knowledge Base contains MantItemVehiclePart records linking a MantItem to a VehicleBrand and VehicleLine
- WHEN a GET request is sent to `/api/maintenance/vehicle-parts` with valid UUID query parameters for `mantItemId`, `vehicleBrandId`, and `vehicleLineId`
- THEN the API MUST return the matching records
- AND the response MUST NOT be an empty array when matching records exist in the database

#### Scenario: Knowledge Base API with partial filters

- GIVEN a GET request to `/api/maintenance/vehicle-parts?vehicleBrandId=uuid-brand`
- WHEN the route handler reads and uses the UUID string directly
- THEN all vehicle-parts records for that brand MUST be returned
- AND records for other brands MUST NOT be included in the response

### Requirement: API Validation Guards for UUID Fields MUST Use String Checks

API routes that validate the presence and format of UUID ID fields MUST use string-based checks. Numeric comparison guards (`id <= 0`, `id < 1`) are dead code when the value is a string and MUST be replaced with proper string validation.

#### Scenario: mant-template route validates vehicleBrandId

- GIVEN the route handler for `/api/maintenance/mant-template` reads `vehicleBrandId` from a request body or query
- WHEN the validation guard checks `vehicleBrandId <= 0`
- THEN for any UUID string (e.g., `"a1b2c3d4-..."`), JavaScript evaluates `"a1b2c3d4-..." <= 0` as `false` (string-to-number coercion produces `NaN`, `NaN <= 0` is `false`)
- THEREFORE the guard is dead code — it never rejects an invalid string value
- AND the guard MUST be replaced with a string check: `!vehicleBrandId || typeof vehicleBrandId !== 'string' || vehicleBrandId.trim() === ''`

#### Scenario: mant-template route with string validation guard — invalid input rejected

- GIVEN a POST or GET request to `/api/maintenance/mant-template` that omits `vehicleBrandId` or sends an empty string
- WHEN the string validation guard `(!vehicleBrandId || vehicleBrandId.trim() === '')` is evaluated
- THEN the guard MUST evaluate to `true`
- AND the route MUST return a 400 Bad Request response

#### Scenario: mant-template route with string validation guard — valid UUID accepted

- GIVEN a POST or GET request to `/api/maintenance/mant-template` with `vehicleBrandId: "a1b2c3d4-e5f6-..."`
- WHEN the string validation guard is evaluated
- THEN the guard MUST evaluate to `false` (the value is a non-empty string)
- AND the route MUST proceed with the Prisma query using the UUID string

#### Scenario: mant-items route validates categoryId

- GIVEN the route handler for `/api/maintenance/mant-items` reads `categoryId` from query or body
- WHEN the validation guard checks `categoryId <= 0`
- THEN the guard is dead code for any UUID string (same reason as vehicleBrandId)
- AND the guard MUST be replaced with a string check: `!categoryId || typeof categoryId !== 'string' || categoryId.trim() === ''`

#### Scenario: mant-items route with string validation guard — valid UUID accepted

- GIVEN a GET request to `/api/maintenance/mant-items?categoryId=uuid-category`
- WHEN the string validation guard is evaluated
- THEN the guard evaluates to `false`
- AND the route MUST proceed and return maintenance items filtered by that categoryId

### Requirement: Prisma Queries MUST NOT Receive NaN as a Filter Value

No Prisma query in any API route MUST have `NaN` as the value for any `where` filter field. Receiving `NaN` as a filter value is treated as a data error that MUST be caught by validation guards before the Prisma call.

#### Scenario: Route correctly validates UUID before Prisma query

- GIVEN a route handler reads a UUID query parameter
- WHEN the validation check passes (non-empty string)
- THEN Prisma MUST receive the UUID string as the filter value
- AND the query MUST execute normally

#### Scenario: Route rejects malformed or missing UUID before Prisma query

- GIVEN a route handler reads an absent or empty query parameter for a required UUID field
- WHEN the string validation check fails
- THEN the route MUST return a 400 Bad Request response immediately
- AND Prisma MUST NOT be called with an undefined, null, empty, or NaN value for that filter field

### Requirement: API Route Integer-ID Patterns MUST NOT Be Reintroduced

Any new API route created for UUID-ID entities MUST NOT introduce `parseInt()` coercion on entity ID fields or numeric range guards (`<= 0`, `< 1`) for UUID fields.

#### Scenario: New API route reads entity ID from query

- GIVEN a developer creates a new API route that reads an entity `id` from `searchParams`
- WHEN the entity model uses String UUID IDs
- THEN the developer MUST use `searchParams.get("id")` directly
- AND MUST apply string validation (`!id || id.trim() === ''`) before the Prisma call
- AND MUST NOT apply `parseInt(searchParams.get("id"))`
