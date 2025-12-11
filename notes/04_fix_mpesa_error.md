# Fix The Error 

## Problem Analysis

The `direct-stk` function was using hardcoded sandbox URLs:
- OAuth: `https://sandbox.safaricom.co.ke/oauth/v1/generate`
- STK Push: `https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest`

However, your M-Pesa credentials might be for **production**, not sandbox. This mismatch causes authentication failures.

## Solution Implemented

### 1. Made M-Pesa API Environment Configurable

Added `MPESA_API_ENV` environment variable:
- Default: `production` (secure by default)
- Set to `sandbox` for development

**Updated URLs:**
```typescript
const MPESA_ENV = Deno.env.get("MPESA_API_ENV") || "production"
const MPESA_BASE_URL = MPESA_ENV === "sandbox"
  ? "https://sandbox.safaricom.co.ke"
  : "https://api.safaricom.co.ke"
```

### 2. Added Better Error Logging

- Log M-Pesa API URLs being called
- Log HTTP error responses with details
- Include `MPESA_ENV` and `MPESA_BASE_URL` in error responses

### 3. Improved Error Handling

- Check HTTP response status before parsing JSON
- Log full error response from M-Pesa
- Include debug info in error responses

## Deployment Steps

### Step 1: Set Environment Variable (Optional)

If testing with sandbox credentials:
```bash
supabase secrets set MPESA_API_ENV="sandbox"
```

If using production credentials (default):
```bash
# No need to set - defaults to production
```

### Step 2: Deploy Updated Function

```bash
supabase functions deploy direct-stk
```

### Step 3: Test with Correct API Environment

Verify which environment your M-Pesa credentials are for:
- **Sandbox**: Register at https://sandbox.safaricom.co.ke/login
- **Production**: Use live M-Pesa API at https://api.safaricom.co.ke

## Error/Fix Report

### Issue Found
- ❌ Function was hardcoded to use sandbox URLs
- ❌ Credentials might be for production environment
- ❌ Mismatch causes authentication failure

### Fix Applied
- ✅ Made API base URL configurable via `MPESA_API_ENV` environment variable
- ✅ Defaults to production for security (use sandbox only for testing)
- ✅ Added detailed error logging for M-Pesa API calls
- ✅ Improved error response with debug information

### Next Steps
1. **Verify Credentials**: Check if M-Pesa credentials are sandbox or production
2. **Set Environment**: Set `MPESA_API_ENV=sandbox` if testing with sandbox credentials
3. **Deploy**: Run `supabase functions deploy direct-stk`
4. **Test**: Call the endpoint and check error response for M-Pesa API details
5. **Debug**: Use returned `mpesaBaseUrl` to verify correct environment is being used


```curl

curl -X POST "https://sgyoocjbdfwzygmpmurc.supabase.co/functions/v1/direct-stk" -H "Content-Type: application/json" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNneW9vY2piZGZ3enlnbXBtdXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzc0ODMsImV4cCI6MjA3OTg1MzQ4M30.BQ5i6ZQXMenWL5S9kv1Bvh7wMU7NG36xz61tneYvxEE" -d '{"mpesa_number":"0723224644","amount":1,"account_reference":"test002","transaction_desc":"Test Payment 2","business_id":"caan-developers"}'
```