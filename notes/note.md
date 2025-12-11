# mpesa backend using supabase

This is a simple backend implementation for handling M-Pesa transactions using Supabase as the database.

## Task 1: Setting up Supabase Local Development Environment

## Steps taken:-

- ran `supabase init` to initialize a new Supabase project.
- ran `supabase start` to start the local Supabase development environment.

```bash


    Database URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
     Mailpit URL: http://127.0.0.1:54324
 Publishable key: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
      Secret key: sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
   S3 Access Key: 625729a08b95bf1b7ff351a663f3a23c
   S3 Secret Key: 850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907
       S3 Region: local

```

- How to create a new function

  - ran `supabase functions new direct-stk` to create a new function named `direct-stk`.
  - got error

```error
Missing version in specifier
Add a version requirement after the package namedeno-lint(no-unversioned-import)
Resolved Dependency

Code: jsr​:​@supabase/functions-js/edge-runtime.d.ts (https://jsr.io/@supabase/functions-js/2.86.0/src/edge-runtime.d.ts)
 ```

## error report and fixes

### Missing Version in JSR Specifier

**Error Encountered:** When creating the `direct-stk` function with `supabase functions new direct-stk`, deno-lint threw an error: "Missing version in specifier - Add a version requirement after the package name" for the import `jsr:@supabase/functions-js/edge-runtime.d.ts`.

**Root Cause:** The JSR (JavaScript Registry) requires all package imports to include explicit version specifiers. Unlike NPM where version specifiers are optional and can default to latest, JSR mandates semantic versioning constraints. The generated template from Supabase contained an unversioned import, which violates JSR's strict requirements and causes linting failures in Deno projects.

**Solution Applied:** Updated the import statement in `supabase/functions/direct-stk/index.ts` from:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
```

to:

```typescript
import "jsr:@supabase/functions-js@^2.86.0/edge-runtime.d.ts"
```

The `@^2.86.0` version specifier uses caret syntax, allowing minor and patch updates while maintaining API compatibility with version 2.86.0. This resolves the linting error and follows JSR best practices for dependency management in Deno environments.

### Testing the Function Locally

- ran `supabase functions serve direct-stk` to test the function locally.
- made a POST request using curl to test the function and it worked.


### Next Steps
- Implement the M-Pesa STK Push logic within the `direct-stk` function.
- Request to direct-stk endpoint with necessary parameters to initiate M-Pesa transactions:

```bash
curl -X POST http://localhost:54321/functions/v1/direct-stk \
  -H "Content-Type: application/json" \
  -d '{
        "phone": "2547XXXXXXXX",
        "amount": 100,
        "accountReference": "internal_id_1234",
        "transactionDesc": "Service Paid Through API"
      }'
```
### Task 2
- Implement M-Pesa STK Push logic in the `direct-stk` function to handle incoming requests and initiate transactions.

#### Implementation Details

The `direct-stk` function has been updated with complete M-Pesa STK Push integration. Here's what was implemented:

**1. Request Validation**
- Validates incoming POST requests with required fields: `phone`, `amount`, `accountReference`, and `transactionDesc`
- Returns 400 error if any required fields are missing
- Only accepts POST method requests

**2. M-Pesa Authentication**
- Implemented `getMpesaAccessToken()` function that:
  - Uses Safaricom's Daraja API OAuth endpoint
  - Requires `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET` environment variables
  - Returns an access token for subsequent API calls

**3. STK Push Initiation**
- Implemented `initiateSTKPush()` function that:
  - Formats phone numbers to international format
  - Generates timestamp in required format
  - Creates password using Base64 encoding: `Base64(BusinessShortCode + Passkey + Timestamp)`
  - Sends request to Safaricom's STK Push endpoint: `https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest`
  - Requires environment variables: `MPESA_BUSINESS_SHORT_CODE` and `MPESA_PASSKEY`

**4. Response Handling**
- Parses M-Pesa API response
- Returns success (ResponseCode: "0") with `CheckoutRequestID` and `RequestID`
- Returns error details if the request fails
- Includes proper HTTP status codes (200 for success, 400 for M-Pesa errors, 500 for server errors)

**5. Environment Variables Required**
```
MPESA_CONSUMER_KEY=<your_consumer_key>
MPESA_CONSUMER_SECRET=<your_consumer_secret>
MPESA_BUSINESS_SHORT_CODE=<your_business_short_code>
MPESA_PASSKEY=<your_passkey>
```

**6. Testing the Implementation**
To test the function locally:
```bash
curl -X POST http://localhost:54321/functions/v1/direct-stk \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "2547XXXXXXXX",
    "amount": 100,
    "accountReference": "internal_id_1234",
    "transactionDesc": "Service Paid Through API"
  }'
```

#### Response Examples

**Success Response:**
```json
{
  "success": true,
  "message": "STK Push initiated successfully",
  "checkoutRequestID": "ws_CO_DMZ_xxxxx",
  "requestID": "10101-xxxxx-xxxxx"
}
```

**Error Response (Missing Fields):**
```json
{
  "error": "Missing required fields: phone, amount, accountReference, transactionDesc"
}
```

**Error Response (Invalid M-Pesa Response):**
```json
{
  "success": false,
  "message": "<M-Pesa error description>",
  "checkoutRequestID": null
}
```

#### Notes
- The function uses Safaricom's sandbox environment. Update URLs to production when ready.
- Set the callback URL in the `CallBackURL` field to handle M-Pesa payment confirmations.
- Phone numbers should be in format: 2547XXXXXXXX (with country code)

#### Next Steps
- Set up database tables to store transaction records
- Implement callback endpoint to handle M-Pesa payment confirmations
- Add database integration to log all transactions
- Implement transaction status tracking


### task 3

I have the supabase MCP and supabase CLI set, get the "SUPABASE_ANON_KEY=<your_supabase_anon_key>" and update #file:.env 

#### report

**Task Completed Successfully!**

Used the Supabase MCP to retrieve the project credentials and update the `.env` file:

**Steps Executed:**
1. Listed all Supabase projects using `mcp_supabase_list_projects`
   - Found the "apypay" project with ID: `sgyoocjbdfwzygmpmurc`

2. Retrieved publishable keys using `mcp_supabase_get_publishable_keys`
   - Retrieved the legacy anon key (JWT-based)
   - Also available: modern publishable key format `sb_publishable_TKFmwEZMkDwX83bhfR0P8w_bEFlWke-`

3. Retrieved the project URL: `https://sgyoocjbdfwzygmpmurc.supabase.co`

4. Updated `.env` file with:
   - **SUPABASE_URL:** `https://sgyoocjbdfwzygmpmurc.supabase.co`
   - **SUPABASE_ANON_KEY:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNneW9vY2piZGZ3enlnbXBtdXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzc0ODMsImV4cCI6MjA3OTg1MzQ4M30.BQ5i6ZQXMenWL5S9kv1Bvh7wMU7NG36xz61tneYvxEE`

**Available API Keys:**
- **Legacy Anon Key (JWT):** Used above, good for backward compatibility
- **Publishable Key:** `sb_publishable_TKFmwEZMkDwX83bhfR0P8w_bEFlWke-` (recommended for new applications)

The `.env` file now contains all necessary Supabase credentials and placeholders for M-Pesa API credentials. Remember to:
- Keep the `.env` file out of version control (add to `.gitignore`)
- Fill in the M-Pesa credentials when you have them: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_BUSINESS_SHORT_CODE`, `MPESA_PASSKEY`