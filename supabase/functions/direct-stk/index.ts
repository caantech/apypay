// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js@^2.86.0/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@^2.43.0"

// Interface for the incoming request
interface STKPushRequest {
  mpesa_number: string
  amount: number
  account_reference: string
  transaction_desc: string
  business_id: string
}

// List of valid businesses using the API
const VALID_BUSINESSES = ["caan-developers", "caan-tech-foundation", "taji-ai"]

// Function to validate business ID against database
async function validateBusinessId(
  businessId: string,
  supabaseUrl: string,
  supabaseKey: string,
): Promise<{
  valid: boolean
  error?: string
}> {
  if (!businessId || businessId.trim() === "") {
    return {
      valid: false,
      error: "Business ID is required",
    }
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await supabase
      .from("clients")
      .select("id, status")
      .eq("business_id", businessId.toLowerCase())
      .eq("status", "active")
      .single()

    if (error || !data) {
      return {
        valid: false,
        error: `Invalid or inactive business ID: ${businessId}`,
      }
    }

    return { valid: true }
  } catch (err) {
    console.error("Error validating business ID:", err)
    return {
      valid: false,
      error: "Business validation error",
    }
  }
}

// Interface for M-Pesa API response
interface MpesaResponse {
  ResponseCode: string
  ResponseDescription: string
  CheckoutRequestID?: string
  RequestID?: string
}

// M-Pesa API Configuration
// Production endpoint only - this is a production-ready backend
const MPESA_BASE_URL = Deno.env.get("MPESA_PROD_URL") || "https://api.safaricom.co.ke"

// Function to get M-Pesa access token
async function getMpesaAccessToken(
  consumerKey: string,
  consumerSecret: string,
): Promise<string> {
  const auth = btoa(`${consumerKey}:${consumerSecret}`)
  
  const tokenUrl = `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`
  
  console.log(`Getting M-Pesa token from: ${tokenUrl}`)
  
  const response = await fetch(
    tokenUrl,
    {
      method: "GET",
      headers: {
        "Authorization": `Basic ${auth}`,
      },
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`M-Pesa token error: ${response.status} - ${errorText}`)
    throw new Error(`Failed to get M-Pesa access token: ${response.status}`)
  }

  const data = await response.json() as Record<string, string>
  return data.access_token
}

// Function to validate Safaricom phone number
function validateSafaricomNumber(phone: string): {
  valid: boolean
  error?: string
  formattedPhone?: string
} {
  // Remove any non-digit characters
  const cleanedPhone = phone.replace(/\D/g, "")

  // Check if it's a valid Kenyan Safaricom number
  // Valid formats: 254722123456, 0722123456, +254722123456
  const safaricomPattern = /^(?:254|\+254|0)?(7[0-9]{8})$/
  
  if (!safaricomPattern.test(phone)) {
    return {
      valid: false,
      error: "Invalid Safaricom phone number. Please use format: 0722123456, 254722123456, or +254722123456",
    }
  }

  // Format to international format: 254722123456
  let formattedPhone = cleanedPhone
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "254" + formattedPhone.substring(1)
  } else if (!formattedPhone.startsWith("254")) {
    formattedPhone = "254" + formattedPhone
  }

  return {
    valid: true,
    formattedPhone,
  }
}

// Function to initiate STK Push
async function initiateSTKPush(
  request: STKPushRequest,
  accessToken: string,
  businessShortCode: string,
  passkey: string,
): Promise<MpesaResponse> {
  const timestamp = new Date().toISOString().replace(/[:-]|\.000Z/g, "").slice(0, 14)
  
  // Format phone number to international format
  const { formattedPhone } = validateSafaricomNumber(request.mpesa_number)
  
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
    CallBackURL: Deno.env.get("CALLBACK_URL") || "https://sgyoocjbdfwzygmpmurc.supabase.co/functions/v1/callback-direct-stk",
    AccountReference: `${request.business_id}:${request.account_reference}`,
    TransactionDesc: request.transaction_desc,
  }

  const response = await fetch(
    `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`M-Pesa STK error: ${response.status} - ${errorText}`)
  }

  const result = await response.json() as MpesaResponse
  return result
}

Deno.serve(async (req) => {
  // ==============================================================================
  // STK PUSH INITIATION - Transaction Lifecycle Start
  // ==============================================================================
  // When STK Push is initiated, the transaction flow is:
  // 1. Client calls this endpoint to initiate payment
  // 2. M-Pesa API is called with customer phone number
  // 3. If successful, a CheckoutRequestID is returned
  // 4. TODO: Transaction should be stored in database with status: 'pending'
  // 5. Customer is prompted to enter M-Pesa PIN
  // 6. M-Pesa processes the payment and calls our callback endpoint
  // 7. Callback updates transaction status to 'success' or 'failed'
  // 8. Callback triggers webhook to notify business system
  //
  // Current limitation: No pending transaction is stored on initiation.
  // TODO: After M-Pesa returns CheckoutRequestID, insert transaction record
  //       with status='pending' and checkout_request_id to track payment status
  // ==============================================================================

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
    if (!body.mpesa_number || !body.amount || !body.account_reference || !body.transaction_desc || !body.business_id) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: mpesa_number, amount, account_reference, transaction_desc, business_id",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    // Validate business ID
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

    const businessValidation = await validateBusinessId(
      body.business_id,
      supabaseUrl,
      supabaseKey,
    )
    if (!businessValidation.valid) {
      return new Response(
        JSON.stringify({
          error: businessValidation.error,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    // Validate Safaricom phone number
    const phoneValidation = validateSafaricomNumber(body.mpesa_number)
    if (!phoneValidation.valid) {
      return new Response(
        JSON.stringify({
          error: phoneValidation.error,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    // Validate amount
    if (typeof body.amount !== "number" || body.amount <= 0) {
      return new Response(
        JSON.stringify({
          error: "Amount must be a positive number",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }
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

    // ==============================================================================
    // Store Pending Transaction After Successful STK Initiation
    // ==============================================================================
    // When M-Pesa returns a successful CheckoutRequestID, store the transaction
    // in the database with status='pending' to track it until callback arrives.
    // ==============================================================================
    try {
      console.log("Starting pending transaction insert for CheckoutRequestID:", stkPushResponse.CheckoutRequestID)
      
      const transactionData = {
        checkout_request_id: stkPushResponse.CheckoutRequestID,
        merchant_request_id: stkPushResponse.RequestID || "",
        business_id: body.business_id,
        account_reference: body.account_reference,
        phone_number: phoneValidation.formattedPhone,
        amount: Number(body.amount),
        result_code: -1,
        result_desc: "STK Push initiated - awaiting customer response",
        mpesa_receipt_number: "",
        transaction_date: "",
        status: "pending",
      }
      
      console.log("Transaction data:", JSON.stringify(transactionData))
      
      // Use Supabase JS client with service role key
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey || supabaseKey)
      
      const { data, error } = await supabaseAdmin
        .from("transactions")
        .insert([transactionData])
      
      if (error) {
        console.error("Insert error:", error.message, error.code)
      } else {
        console.log("✓ Pending transaction inserted with business_id:", body.business_id)
      }
    } catch (err) {
      console.error("Exception:", err instanceof Error ? err.message : String(err))
    }

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        message: "STK Push initiated successfully",
        checkoutRequestID: stkPushResponse.CheckoutRequestID,
        requestID: stkPushResponse.RequestID,
        businessId: body.business_id,
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
  2. Make an HTTP request with proper M-Pesa credentials in .env:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/direct-stk' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{
      "mpesa_number": "0723224644",
      "amount": 100,
      "account_reference": "test_001",
      "transaction_desc": "Test Payment"
    }'

  Valid Safaricom phone number formats:
  - 0722123456 (local format)
  - 254722123456 (international format)
  - +254722123456 (international with +)

*/
