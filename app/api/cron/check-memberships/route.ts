// Vercel Cron Job endpoint - runs daily at 23:00 UTC (00:00 CET / Midnight in Serbia)
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  console.log("[GARD018 CRON] ====== CRON JOB TRIGGERED ======")
  console.log("[GARD018 CRON] Timestamp:", new Date().toISOString())
  console.log("[GARD018 CRON] Authorization header:", request.headers.get("authorization"))

  // Import the check-memberships logic
  const { GET: checkMemberships } = await import("../../check-memberships/route")

  try {
    const response = await checkMemberships(request)
    console.log("[GARD018 CRON] ====== CRON JOB COMPLETED ======")
    return response
  } catch (error) {
    console.error("[GARD018 CRON] ====== CRON JOB FAILED ======")
    console.error("[GARD018 CRON] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Cron job failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export const dynamic = "force-dynamic"
export const maxDuration = 60
