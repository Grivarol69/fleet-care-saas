# Onboarding Specification

## Purpose

Define the required behavior for creating new Tenants and prepopulating their initial database state, as well as the UI interaction between Clerk's Organization creation and the internal Onboarding Wizard.

## Requirements

### Requirement: Clerk Organization Name Sync

The system MUST automatically capture the Organization Name defined by the user in the Clerk `<OrganizationList>` component and use it to complete the internal Tenant profile without asking the user to type it again.

#### Scenario: User creates a new Organization in Clerk
- GIVEN the user is on the `/onboarding` page and sees the Clerk Organization List
- WHEN the user creates an organization named "Logistica Los Andes"
- THEN the system redirects to the internal Onboarding Wizard
- AND the internal form MUST hide the "Organization Name" input
- AND the system MUST submit "Logistica Los Andes" as the tenant name during profile completion.

### Requirement: Tenant Seed Data

The system MUST NOT seed global entities (Brands, Types, Categories) during `seedTenantData`. Instead, it MUST seed exactly one dummy instance of core entities necessary for a complete demonstration of the system's capabilities.

#### Scenario: A new tenant completes onboarding
- GIVEN a tenant has just submitted their profile (country, currency)
- WHEN the `seedTenantData` action is executed
- THEN the system MUST create 1 dummy `Vehicle`
- AND the system MUST create 1 dummy `Driver`
- AND the system MUST create 1 dummy `Provider`
- AND the system MUST NOT create any `VehicleBrand`, `VehicleType`, or `MantCategory`.
