// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js@^2.86.0/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@^2.43.0"

// Interface for M-Pesa callback payload
interface MpesaCallbackPayload {
  Body: {
    stkCallback: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata?: {
        Item: Array<{
          Name: string
          Value: string | number
        }>
      }
    }
  }
}

// Interface for transaction record
interface TransactionRecord {
  checkout_request_id: string
  merchant_request_id: string
  business_id: string
  account_reference: string
  phone_number: string
  amount: number
  result_code: number
  result_desc: string
  mpesa_receipt_number?: string
  transaction_date?: string
  callback_raw: Record<string, unknown>
  status: string
}

// Helper function to extract callback metadata
function extractCallbackMetadata(
  items: Array<{ Name: string; Value: string | number }>,
): Record<string, string | number> {
  const metadata: Record<string, string | number> = {}
  items.forEach((item) => {
    metadata[item.Name] = item.Value
  })
  return metadata
}

Deno.serve(async (req) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } },
    )
  }

  try {
    // Parse callback payload
    const payload: MpesaCallbackPayload = await req.json()

    console.log("M-Pesa Callback Received:", JSON.stringify(payload, null, 2))

    // Extract STK callback data
    const stkCallback = payload.Body?.stkCallback
    if (!stkCallback) {
      console.error("Invalid callback payload structure")
      return new Response(
        JSON.stringify({ error: "Invalid callback payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    // Extract metadata
    const metadata = stkCallback.CallbackMetadata?.Item
      ? extractCallbackMetadata(stkCallback.CallbackMetadata.Item)
      : {}

    // Extract business_id from account reference (format: "business_id:account_reference")
    const accountRef = String(metadata.AccountReference || stkCallback.CheckoutRequestID)
    const [businessId, actualAccountReference] = accountRef.includes(":")
      ? accountRef.split(":")
      : ["unknown", accountRef]

    // Prepare transaction record
    const transactionRecord: TransactionRecord = {
      checkout_request_id: stkCallback.CheckoutRequestID,
      merchant_request_id: stkCallback.MerchantRequestID,
      business_id: businessId,
      account_reference: actualAccountReference,
      phone_number: String(metadata.PhoneNumber || ""),
      amount: Number(metadata.Amount || 0),
      result_code: stkCallback.ResultCode,
      result_desc: stkCallback.ResultDesc,
      mpesa_receipt_number: String(metadata.MpesaReceiptNumber || ""),
      transaction_date: String(metadata.TransactionDate || ""),
      callback_raw: stkCallback,
      status: stkCallback.ResultCode === 0 ? "success" : "failed",
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY")

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration")
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Store transaction record in database
    const { data, error } = await supabase
      .from("transactions")
      .insert([transactionRecord])
      .select()

    if (error) {
      console.error("Database error:", error)
      // Log error but still return 200 to M-Pesa to prevent retries
      return new Response(
        JSON.stringify({
          ResultCode: 0,
          ResultDesc: "Callback received but database storage failed",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )
    }

    console.log("Transaction recorded successfully:", data)

    // Log callback details
    console.log(`Payment ${stkCallback.ResultCode === 0 ? "successful" : "failed"}:`, {
      businessId: businessId,
      checkoutRequestID: stkCallback.CheckoutRequestID,
      resultCode: stkCallback.ResultCode,
      resultDesc: stkCallback.ResultDesc,
      amount: metadata.Amount,
      phoneNumber: metadata.PhoneNumber,
      mpesaReceiptNumber: metadata.MpesaReceiptNumber,
    })

    // Return success response to M-Pesa
    // M-Pesa expects a 200 OK response to confirm callback receipt
    return new Response(
      JSON.stringify({
        ResultCode: 0,
        ResultDesc: "Callback received successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("Error processing callback:", error)
    // Return 200 to prevent M-Pesa from retrying
    return new Response(
      JSON.stringify({
        ResultCode: 0,
        ResultDesc: "Callback received",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Create a transactions table in your database
  3. Make an HTTP POST request (simulating M-Pesa callback):

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/callback-direct-stk' \
    --header 'Content-Type: application/json' \
    --data '{
      "Body": {
        "stkCallback": {
          "MerchantRequestID": "16813-1590511757-1",
          "CheckoutRequestID": "ws_CO_DMZ_87517_2556758376",
          "ResultCode": 0,
          "ResultDesc": "The service request has been processed successfully.",
          "CallbackMetadata": {
            "Item": [
              {
                "Name": "Amount",
                "Value": 100
              },
              {
                "Name": "MpesaReceiptNumber",
                "Value": "LHG31AA60V7"
              },
              {
                "Name": "TransactionDate",
                "Value": "20191228183027"
              },
              {
                "Name": "PhoneNumber",
                "Value": "254723000000"
              }
            ]
          }
        }
      }
    }'

  Note: For production, set the CallBackURL in direct-stk function to point to this endpoint.

*/
