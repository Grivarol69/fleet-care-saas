# Admin KB Specification

## Purpose

The Administrative Knowledge Base (KB) module manages the global data that serves as the foundation for all tenants in the system. Specifically, this spec focuses on the automated import and parsing of OEM service manuals to generate maintenance intervals and parts catalogs using AI-driven Optical Character Recognition and NLP (Claude Vision API).

## Requirements

### Requirement: Upload Service Manual

The system MUST allow SUPER_ADMIN users to upload service manual files (PDF, JPG, PNG) for processing.

#### Scenario: Valid file upload

- GIVEN the user is authenticated as a SUPER_ADMIN
- WHEN the user uploads a valid PDF service manual file under 10MB
- THEN the system accepts the file and initiates the AI parsing process
- AND returns a structured JSON response containing proposed maintenance items and parts

#### Scenario: Invalid user role

- GIVEN the user is authenticated as a regular Tenant Admin or generic user
- WHEN the user attempts to access the upload endpoint or UI
- THEN the system rejects the request with a 403 Forbidden error

#### Scenario: File too large

- GIVEN the user is authenticated as a SUPER_ADMIN
- WHEN the user uploads a PDF larger than the allowed limit (e.g., > 10MB)
- THEN the system rejects the file and returns a 400 Bad Request error

### Requirement: AI Parsing and Extraction

The system MUST extract maintenance intervals, service descriptions, and part numbers from the uploaded document accurately.

#### Scenario: Accurate extraction

- GIVEN a valid uploaded PDF with maintenance schedules
- WHEN the system sends the document to the Claude Vision API
- THEN the API returns a structured array of `MantItem` proposals (intervals in km/months) and associated `MasterPart` identifiers

#### Scenario: API Failure or Timeout

- GIVEN a valid uploaded PDF
- WHEN the Claude Vision API takes too long or returns an error
- THEN the system gracefully catches the error and informs the user to try again or split the document into smaller parts

### Requirement: Review and Approve Proposals

The system MUST NOT automatically save AI-generated data to the global database without human review.

#### Scenario: Successful approval

- GIVEN the system has returned a list of proposed maintenance items
- WHEN the SUPER_ADMIN reviews, modifies any typos, and clicks "Approve and Save"
- THEN the system creates the corresponding `MantItem` and `MasterPart` records with `tenantId: null`
- AND the new records become immediately available to all tenants

#### Scenario: Rejection or Cancellation

- GIVEN the system has returned a list of proposed maintenance items
- WHEN the SUPER_ADMIN clicks "Cancel" or closes the window
- THEN no records are created in the database and the extracted data is discarded
