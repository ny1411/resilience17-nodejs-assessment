# Project Plan: Node.js Backend Engineer 2026 Assessment

## Overview
Build a **Creator Card microservice API** that lets creators publish a shareable profile card showcasing their links and service rates (think "link-in-bio" cards with rate cards attached). The API will consist of three endpoints: creating, publicly retrieving, and deleting a card.

## Tech Stack & Architecture
- **Language/Framework:** Node.js (Vanilla JavaScript), Express.js
- **Database:** MongoDB (via MongoDB Atlas free tier)
- **Base Architecture:** Must use the provided [Backend Template Repository](https://github.com/the17thstudio/node-template) exactly (services, endpoints, messages, middleware conventions).
- **Validation:** Use the template's validator (VSL) for field-level validation.
- **Deployment:** Heroku, Render, or similar cloud platform. No authentication required. No URL versioning.

## How to Start the Project
1. **Clone the Template:** Clone or use the provided [Backend Template Repository](https://github.com/the17thstudio/node-template).
2. **Install Dependencies:** Run `npm install` in the project root.
3. **Setup Environment Variables:** Create a `.env` file and configure your MongoDB connection string (e.g., `MONGODB_URI`) and any other required variables based on the template.
4. **Run the Server:** Start the development server using the template's designated script (e.g., `npm run dev` or `npm start`).

## Implementation Tasks

### 1. Project Setup & Environment Configuration
- [x] **Clone and Initialize Repository**
  - [x] Clone the official `node-template` repository locally.
  - [x] Initialize a new public GitHub repository for the assessment submission.
  - [x] Push the initial template code to your new public repository.
- [x] **Configure Database and Environment**
  - [x] Set up a free-tier MongoDB Atlas cluster.
  - [x] Obtain the MongoDB connection string.
  - [x] Create a `.env` file from the template's example and configure the `MONGODB_URI` and any other required variables.

### 2. Database Schema (Creator Card Entity)
- [x] **Define the Mongoose Schema**
  - [x] Implement the `CreatorCard` schema incorporating all required fields: `title`, `description`, `slug`, `creator_reference`, `links`, `service_rates`, `status`, `access_type`, `access_code`, `created`, `updated`, `deleted`.
  - [x] Apply specific field constraints directly at the schema level (e.g., max lengths, required status).
- [x] **Implement Serialization Layer**
  - [x] Ensure that MongoDB's internal `_id` is never returned.
  - [x] Map the internal `_id` to `id` (ULID string) in all API responses using Mongoose transforms or a dedicated serialization function.

### 3. Endpoint 1: Create Creator Card (`POST /creator-cards`)
- [x] **Scaffold and Input Validation**
  - [x] Create the endpoint route and controller following the backend template structure.
  - [x] Implement request body validation using the template's Validator DSL (VSL). Ensure it returns HTTP 400 for structural failures (e.g., missing fields, invalid types, length constraints).
- [x] **Implement Business Logic: Slug Auto-Generation**
  - [x] Check if the `slug` is omitted from the request.
  - [x] If omitted: Lowercase the `title`, replace whitespace with hyphens (`-`), and strip out any characters that are not letters, numbers, hyphens, or underscores.
  - [x] If the resulting auto-generated slug is shorter than 5 characters OR already exists in the database, append a hyphen followed by a random 6-character alphanumeric suffix.
- [x] **Implement Business Logic: Error Handling**
  - [x] Validate slug uniqueness: If the client provides a `slug` that already exists, throw an error and return custom error code `SL02` with HTTP 400.
  - [x] Validate private access: If `access_type` is `private`, ensure `access_code` is provided. If missing, return custom error code `AC01` with HTTP 400.
  - [x] Validate public access: If `access_type` is `public` (or omitted), ensure `access_code` is NOT provided. If present, return custom error code `AC05` with HTTP 400.
- [x] **Finalize Creation**
  - [x] Save the document to MongoDB. Default `access_type` to `public` if not specified.
  - [x] Return the created card (including `access_code`) with HTTP 200 using the specified JSON structure.

### 4. Endpoint 2: Public Card Retrieval (`GET /creator-cards/:slug`)
- [x] **Scaffold Endpoint**
  - [x] Create the endpoint route to accept a `slug` URL parameter and an optional `access_code` query parameter.
- [x] **Implement Access Rules and Error Handling** (Must be applied in this exact order):
  - [x] Fetch the card by `slug`. If it does not exist, return HTTP 404 with error code `NF01`.
  - [x] Check `status`: If the card is a `draft`, return HTTP 404 with error code `NF02`.
  - [x] Check `access_type`: If the card is `private`, verify the `access_code`.
    - [x] If no `access_code` query parameter is supplied, return HTTP 403 with error code `AC03`.
    - [x] If the supplied `access_code` does not match the database, return HTTP 403 with error code `AC04`.
- [x] **Finalize Retrieval**
  - [x] Strip the `access_code` from the card data before returning it.
  - [x] Return the card data with HTTP 200 using the specified JSON structure.

### 5. Endpoint 3: Delete Creator Card (`DELETE /creator-cards/:slug`)
- [x] **Scaffold and Input Validation**
  - [x] Create the endpoint route.
  - [x] Validate the request body to ensure it contains a `creator_reference` of exactly 20 characters.
- [x] **Implement Business Logic**
  - [x] Fetch the card by the given `slug`.
  - [x] If the card does not exist, return HTTP 404 with error code `NF01`.
  - [x] Perform a soft or hard delete of the card. If soft-deleting, update the `deleted` timestamp to the current Unix epoch time.
  - [x] Verify that deleted cards will no longer be retrievable by Endpoint 2 (Endpoint 2 should return `NF01`).
- [x] **Finalize Deletion**
  - [x] Return the deleted card data (in the same format as the creation response) with HTTP 200.

### 6. Verification & Testing
- [x] **Positive Test Cases**
  - [x] Test Case 1: Execute full card creation and verify HTTP 200 and data mapping.
  - [x] Test Case 2: Verify slug auto-generation from title (HTTP 200).
  - [x] Test Case 3: Create a private card and verify the `access_code` is returned (HTTP 200).
  - [x] Test Case 4: Retrieve a public, published card successfully (HTTP 200).
  - [x] Test Case 5: Retrieve a private card with the correct pin (HTTP 200).
  - [x] Test Case 6: Delete a card and verify the response structure (HTTP 200).
- [x] **Negative / Edge Test Cases**
  - [x] Test Case 7: Create a card with a duplicate slug (Expect HTTP 400, `SL02`).
  - [x] Test Case 8: Create a private card missing the `access_code` (Expect HTTP 400, `AC01`).
  - [x] Test Case 9: Create a public card with an `access_code` (Expect HTTP 400, `AC05`).
  - [x] Test Case 10: Trigger a framework validation failure, e.g., invalid status (Expect HTTP 400).
  - [x] Test Case 11: Attempt to retrieve a non-existent card (Expect HTTP 404, `NF01`).
  - [x] Test Case 12: Attempt to retrieve a draft card (Expect HTTP 404, `NF02`).
  - [x] Test Case 13: Attempt to retrieve a private card without a pin (Expect HTTP 403, `AC03`).
  - [x] Test Case 14: Attempt to retrieve a private card with a wrong pin (Expect HTTP 403, `AC04`).
  - [x] Test Case 15: Attempt to delete a non-existent card (Expect HTTP 404, `NF01`).
  - [x] Test Case 16: Attempt to retrieve a previously deleted card (Expect HTTP 404, `NF01`).

### 7. Deployment & Submission
- [ ] **Platform Deployment**
  - [ ] Connect your repository to Heroku, Render, or a similar platform.
  - [ ] Ensure all environment variables are properly set in the cloud provider.
- [ ] **Final Sanity Checks**
  - [ ] Test the live endpoints. Ensure they sit at the root URL (e.g., `POST https://submission.herokuapp.com/creator-cards`).
  - [ ] Verify absolutely NO authentication (API keys/bearer tokens) is required for the live endpoints.
  - [ ] Verify `_id` is successfully hidden and `id` is properly serialized.
- [ ] **Submission**
  - [ ] Review the `Submission Checklist` outlined in the assessment description.
  - [ ] Submit the Google Form with your public GitHub link and deployed base URL prior to the June 24, 2026 deadline.
