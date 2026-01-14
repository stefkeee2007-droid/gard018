// Manual test endpoint - call this to manually trigger membership check
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  console.log("[GARD018 TEST] ====== MANUAL CRON TEST TRIGGERED ======")
  console.log("[GARD018 TEST] Timestamp:", new Date().toISOString())

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://gard018.com"
    const response = await fetch(`${baseUrl}/api/check-memberships`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    })

    const data = await response.json()

    console.log("[GARD018 TEST] Response status:", response.status)
    console.log("[GARD018 TEST] Response:", JSON.stringify(data, null, 2))
    console.log("[GARD018 TEST] ====== TEST COMPLETED ======")

    return NextResponse.json({
      testTriggered: true,
      timestamp: new Date().toISOString(),
      status: response.status,
      result: data,
    })
  } catch (error) {
    console.error("[GARD018 TEST] ====== TEST FAILED ======")
    console.error("[GARD018 TEST] Error:", error)
    return NextResponse.json(
      {
        testTriggered: false,
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

export const dynamic = "force-dynamic"
