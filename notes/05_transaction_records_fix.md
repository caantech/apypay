# Fixing the transaction recording issue

### instructions
```prompt
- The prompt was initiated succeessfully, but no transaction was recorded.

Outcome: The STK-PUSH works, but no transaction was recorded. I also expected, after initiation of the stk-push, the response of the mpesa successful initiation of the prompt would have been recorded, but with the status, pending. And the callback to update it to the result received.
```

### analysis
1. Review the `callback-direct-stk` function code to ensure it correctly processes the M-Pesa callback payload.
2. Use the Supabase logs using the Supabase MCP to identify any errors during the callback processing.

### probable causes
- The callback function may be rejecting the payload due to missing authentication or validation errors. Deploy the Callback function with the flag '--no-verify-jwt' to bypass JWT verification for testing.

### solution 1
- Check the Supabase logs for any errors during the callback processing.
- Check the records in the database to see if any transactions were partially recorded.
- Deploy the `callback-direct-stk` function with the `--no-verify-jwt` flag to bypass JWT verification for testing purposes.

```bash
supabase functions deploy callback-direct-stk --no-verify-jwt
```
Record below the outcome of the solution-1
### report after trial

**Status: Implementation In Progress**

#### Solution 1 - Deployed callback-direct-stk with --no-verify-jwt
- ✅ Deployed callback function with JWT bypass flag
- ✅ Callback now returns 200 status (was 401 before)
- This allows M-Pesa to successfully POST callbacks without JWT auth errors

#### Solution 2 - Added Pending Transaction Recording to direct-stk
- ✅ Updated `direct-stk` function to insert transactions with status='pending'
- ✅ Transaction insert includes: checkout_request_id, phone_number, amount, business_id, account_reference
- ✅ Code includes error handling and detailed console logging
- ⚠️ **Issue**: Transactions not appearing in database after function calls
  - Manual SQL insert works ✅
  - Function returns 200 status ✅  
  - Service role key is configured ✅
  - RLS is disabled ✅
  - Supabase client code looks correct ✅
  - **Hypothesis**: Possible RPC/API permission issue or silent failure in Supabase JS client

#### Next Steps to Debug
1. Check if SUPABASE_SERVICE_ROLE_KEY is properly set as a secret in Supabase Cloud
2. Try using raw SQL via Supabase client instead of `.from().insert()`
3. Add response logging to see if Supabase client is returning errors
4. Consider using Supabase Admin API directly for transaction inserts
5. Verify transaction table schema matches what function is trying to insert 