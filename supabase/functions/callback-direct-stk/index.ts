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

// Map M-Pesa result codes to specific transaction statuses
function mapResultCodeToStatus(resultCode: number): string {
  const statusMap: Record<number, string> = {
    0: "completed",           // Successfully paid
    1: "insufficient_funds",  // Insufficient funds in customer account
    2: "insufficient_amount", // Less than minimum transaction value
    17: "cancelled",          // Transaction cancelled by user
    // Add more codes as encountered
  }

  return statusMap[resultCode] || "failed" // Default to 'failed' for unknown codes
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

    console.log("Extracted metadata:", JSON.stringify(metadata))

    // Extract business_id from account reference (format: "business_id:account_reference")
    // Try multiple sources for AccountReference
    const accountRef = String(
      metadata.AccountReference || 
      metadata.account_reference ||
      stkCallback.CheckoutRequestID
    )
    
    console.log("Account reference:", accountRef)
    
    let [businessId, actualAccountReference] = accountRef.includes(":")
      ? accountRef.split(":", 1).length === 2 
        ? accountRef.split(":")
        : ["unknown", accountRef]
      : ["unknown", accountRef]

    console.log("Parsed business_id:", businessId, "account_reference:", actualAccountReference)

    // If business_id is still unknown, try to look it up from pending transactions
    if (businessId === "unknown") {
      console.log("Business ID unknown, attempting to look up from pending transactions...")
      const supabaseUrl = Deno.env.get("SUPABASE_URL")
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
        Deno.env.get("SUPABASE_ANON_KEY")
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const { data: pendingTx } = await supabase
          .from("transactions")
          .select("business_id")
          .eq("checkout_request_id", stkCallback.CheckoutRequestID)
          .single()
        
        if (pendingTx?.business_id) {
          businessId = pendingTx.business_id
          console.log("Found business_id from pending transaction:", businessId)
        }
      }
    }

    // Map M-Pesa result code to specific status
    const transactionStatus = mapResultCodeToStatus(stkCallback.ResultCode)

    // Prepare transaction record
    const transactionRecord: TransactionRecord = {
      checkout_request_id: stkCallback.CheckoutRequestID,
      merchant_request_id: stkCallback.MerchantRequestID,
      business_id: businessId === "unknown" ? "caan-developers" : businessId, // Fallback to first business
      account_reference: actualAccountReference,
      phone_number: String(metadata.PhoneNumber || ""),
      amount: Number(metadata.Amount || 0),
      result_code: stkCallback.ResultCode,
      result_desc: stkCallback.ResultDesc,
      mpesa_receipt_number: String(metadata.MpesaReceiptNumber || ""),
      transaction_date: String(metadata.TransactionDate || ""),
      callback_raw: stkCallback,
      status: transactionStatus,
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

    // ==============================================================================
    // WEBHOOK TRIGGER - Transaction Status Update Notification
    // ==============================================================================
    // After the transaction status is updated in the database, a webhook POST request
    // should be sent to notify the business system about the payment result.
    // 
    // Flow:
    // 1. M-Pesa sends callback with payment result (success/failed)
    // 2. Transaction status is updated in database
    // 3. Webhook URL (from clients table) is invoked with transaction details
    // 4. Business system receives notification and updates their records
    //
    // TODO: Implement webhook notification
    // - Retrieve webhook_url from clients table for the business
    // - Prepare payload with transaction details and status code
    // - Send POST request to webhook URL
    // - Handle webhook failures (retry logic, logging)
    // ==============================================================================
    
    // TODO: Uncomment and implement webhook notification
    /*
    try {
      // 1. Get webhook URL for this business from clients table
      const { data: clientData } = await supabase
        .from("clients")
        .select("webhook_url")
        .eq("business_id", businessId)
        .single()

      const webhookUrl = clientData?.webhook_url

      if (webhookUrl) {
        // 2. Prepare webhook payload with transaction details
        const webhookPayload = {
          event: "transaction.status_updated",
          timestamp: new Date().toISOString(),
          data: {
            checkout_request_id: stkCallback.CheckoutRequestID,
            business_id: businessId,
            account_reference: actualAccountReference,
            phone_number: metadata.PhoneNumber,
            amount: metadata.Amount,
            status: transactionStatus,
            result_code: stkCallback.ResultCode,
            result_desc: stkCallback.ResultDesc,
            mpesa_receipt_number: metadata.MpesaReceiptNumber,
            transaction_date: metadata.TransactionDate,
          },
        }

        // 3. Send POST request to business webhook URL
        const webhookResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webhookPayload),
        })

        if (!webhookResponse.ok) {
          console.error(
            `Webhook failed for ${businessId}:`,
            webhookResponse.status,
            await webhookResponse.text(),
          )
          // TODO: Implement retry logic or queue failed webhooks
        } else {
          console.log(`Webhook sent successfully to ${businessId}`)
        }
      }
    } catch (webhookError) {
      console.error("Error sending webhook:", webhookError)
      // TODO: Queue failed webhook for retry
    }
    */

    // Log callback details
    console.log(`Payment ${transactionStatus}:`, {
      businessId: businessId,
      checkoutRequestID: stkCallback.CheckoutRequestID,
      resultCode: stkCallback.ResultCode,
      resultDesc: stkCallback.ResultDesc,
      status: transactionStatus,
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
