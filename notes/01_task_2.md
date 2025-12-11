# Deploying and Testing

### instructions
```prompt
In this file , we want to deploy to supabase and test. Write the tasks below, but do not implement.
```

### tasks

#### Database Setup
1. Create `transactions` table in Supabase Cloud with columns:
   - `id` (UUID, primary key)
   - `checkout_request_id` (TEXT, unique)
   - `merchant_request_id` (TEXT)
   - `phone_number` (TEXT)
   - `amount` (NUMERIC)
   - `result_code` (INTEGER)
   - `result_desc` (TEXT)
   - `mpesa_receipt_number` (TEXT, nullable)
   - `transaction_date` (TEXT, nullable)
   - `callback_raw` (JSONB)
   - `status` (TEXT)
   - `created_at` (TIMESTAMP, default: now())
   - `updated_at` (TIMESTAMP, default: now())

2. Set up Row Level Security (RLS) policies for the `transactions` table

#### Environment Configuration
3. Add production M-Pesa environment variables to Supabase project secrets:
   - `MPESA_CONSUMER_KEY`
   - `MPESA_CONSUMER_SECRET`
   - `MPESA_BUSINESS_SHORT_CODE`
   - `MPESA_PASSKEY`

4. Add `CALLBACK_URL` environment variable pointing to the deployed callback endpoint

#### Function Deployment
5. Deploy `direct-stk` function to Supabase Cloud

6. Deploy `callback-direct-stk` function to Supabase Cloud

7. Verify both functions are deployed and accessible

#### Testing - Direct STK Push Function
8. Test `direct-stk` function with valid Safaricom number and verify:
   - Accepts POST requests only
   - Validates required fields (mpesa_number, amount, account_reference, transaction_desc)
   - Validates Safaricom phone number format
   - Returns CheckoutRequestID on successful initiation
   - Returns proper error messages for invalid inputs

9. Test with various invalid inputs:
   - Missing required fields
   - Invalid phone number formats
   - Invalid amount (negative, zero, or non-numeric)
   - Non-POST requests

#### Testing - Callback Function
10. Simulate M-Pesa callback with sample payload and verify:
    - Callback is received successfully
    - Transaction data is stored in database
    - Response returns 200 OK status code
    - All transaction fields are captured correctly

11. Test callback error handling:
    - Invalid payload structure
    - Database connection errors
    - Missing environment variables

#### Integration Testing
12. Perform end-to-end test with actual M-Pesa sandbox credentials:
    - Initiate STK Push via `direct-stk` function
    - Receive M-Pesa callback
    - Verify transaction recorded in database

13. Test transaction status tracking:
    - Verify success transactions are marked with status "success"
    - Verify failed transactions are marked with status "failed"

#### Production Readiness
14. Update CallBackURL in `direct-stk` function to production endpoint

15. Set up monitoring and logging for both functions

16. Document API endpoints and usage instructions

17. Create migration script for database schema (if using Supabase migrations)
