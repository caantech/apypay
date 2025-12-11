// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js@^2.86.0/edge-runtime.d.ts"

// Interface for the incoming request
interface STKPushRequest {
  phone: string
  amount: number
  accountReference: string
  transactionDesc: string
}

// Interface for M-Pesa API response
interface MpesaResponse {
  ResponseCode: string
  ResponseDescription: string
  CheckoutRequestID?: string
  RequestID?: string
}

// Function to get M-Pesa access token
async function getMpesaAccessToken(
  consumerKey: string,
  consumerSecret: string,
): Promise<string> {
  const auth = btoa(`${consumerKey}:${consumerSecret}`)
  
  const response = await fetch(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      method: "GET",
      headers: {
        "Authorization": `Basic ${auth}`,
      },
    },
  )

  const data = await response.json() as Record<string, string>
  return data.access_token
}

// Function to initiate STK Push
async function initiateSTKPush(
  request: STKPushRequest,
  accessToken: string,
  businessShortCode: string,
  passkey: string,
): Promise<MpesaResponse> {
  const timestamp = new Date().toISOString().replace(/[:-]|\.000Z/g, "").slice(0, 14)
  
  // Format phone number to international format (remove + if present)
  const formattedPhone = request.phone.replace(/^\+/, "")
  
  // Generate password: Base64(BusinessShortCode + Passkey + Timestamp)
  const password = btoa(`${businessShortCode}${passkey}${timestamp}`)

  const payload = {
    BusinessShortCode: businessShortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: request.amount,
    PartyA: formattedPhone,
    PartyB: businessShortCode,
    PhoneNumber: formattedPhone,
    CallBackURL: "https://your-callback-url/callback", // Update this with your actual callback URL
    AccountReference: request.accountReference,
    TransactionDesc: request.transactionDesc,
  }

  const response = await fetch(
    "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    },
  )

  const result = await response.json() as MpesaResponse
  return result
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
    // Parse request body
    const body: STKPushRequest = await req.json()

    // Validate required fields
    if (!body.phone || !body.amount || !body.accountReference || !body.transactionDesc) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: phone, amount, accountReference, transactionDesc",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    // Get environment variables
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY")
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET")
    const businessShortCode = Deno.env.get("MPESA_BUSINESS_SHORT_CODE")
    const passkey = Deno.env.get("MPESA_PASSKEY")

    if (!consumerKey || !consumerSecret || !businessShortCode || !passkey) {
      console.error("Missing M-Pesa environment variables")
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      )
    }

    // Get M-Pesa access token
    const accessToken = await getMpesaAccessToken(consumerKey, consumerSecret)

    // Initiate STK Push
    const stkPushResponse = await initiateSTKPush(
      body,
      accessToken,
      businessShortCode,
      passkey,
    )

    // Log the response
    console.log("STK Push Response:", stkPushResponse)

    // Check if the request was successful
    if (stkPushResponse.ResponseCode !== "0") {
      return new Response(
        JSON.stringify({
          success: false,
          message: stkPushResponse.ResponseDescription,
          checkoutRequestID: stkPushResponse.CheckoutRequestID,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        message: "STK Push initiated successfully",
        checkoutRequestID: stkPushResponse.CheckoutRequestID,
        requestID: stkPushResponse.RequestID,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("Error in direct-stk function:", error)
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/direct-stk' --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' --header 'Content-Type: application/json' --data '{"name":"Functions"}'

*/
