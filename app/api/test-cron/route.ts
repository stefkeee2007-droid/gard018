import { NextResponse } from "next/server"
import { processMembershipExpirations } from "@/lib/membership-service"

export async function GET(request: Request) {
  console.log("[GARD018 TEST] ====== MANUAL CRON TEST TRIGGERED ======")
  console.log("[GARD018 TEST] Timestamp:", new Date().toISOString())

  try {
    const result = await processMembershipExpirations()

    console.log("[GARD018 TEST] Result:", JSON.stringify(result, null, 2))
    console.log("[GARD018 TEST] ====== TEST COMPLETED ======")

    return NextResponse.json({
      testTriggered: true,
      timestamp: new Date().toISOString(),
      result,
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
