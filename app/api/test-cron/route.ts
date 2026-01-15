import { NextResponse } from "next/server"
import { sql } from "@/lib/db-singleton"

export async function GET(request: Request) {
  console.log("[GARD018 TEST] ====== MANUAL CRON TEST TRIGGERED ======")

  try {
    const nowUTC = new Date()
    const UTC_OFFSET_MS = 1 * 60 * 60 * 1000 // CET = UTC+1
    const nowBelgrade = new Date(nowUTC.getTime() + UTC_OFFSET_MS)

    // Get date in YYYY-MM-DD format
    const todayStr = nowBelgrade.toISOString().split("T")[0]

    console.log("[GARD018 TEST] Server UTC time:", nowUTC.toISOString())
    console.log("[GARD018 TEST] Belgrade time (UTC+1):", nowBelgrade.toISOString())
    console.log("[GARD018 TEST] Searching for expiry_date =", todayStr)

    console.log("[GARD018 TEST] Fetching ALL members from database...")
    const allMembers = await sql`
      SELECT id, first_name, last_name, email, 
             expiry_date, 
             DATE(expiry_date) as expiry_date_only,
             status
      FROM members
      ORDER BY expiry_date ASC
    `

    console.log(`[GARD018 TEST] Total members: ${allMembers.length}`)
    allMembers.forEach((m: any) => {
      console.log(
        `  - ${m.first_name} ${m.last_name}: expiry_date=${m.expiry_date}, date_only=${m.expiry_date_only}, status=${m.status}`,
      )
    })

    console.log(`[GARD018 TEST] Searching for members expiring on ${todayStr}...`)
    const expiringToday = await sql`
      SELECT id, first_name, last_name, email, expiry_date, status
      FROM members
      WHERE DATE(expiry_date) = ${todayStr}
    `

    console.log(`[GARD018 TEST] Found ${expiringToday.length} members expiring today`)
    expiringToday.forEach((m: any) => {
      console.log(`  - ${m.first_name} ${m.last_name}: ${m.expiry_date} (status: ${m.status})`)
    })

    const expiringTodayAlt = await sql`
      SELECT id, first_name, last_name, email, expiry_date, status
      FROM members
      WHERE expiry_date::text LIKE ${todayStr + "%"}
    `

    console.log(`[GARD018 TEST] Alternative search (string match): ${expiringTodayAlt.length} members`)

    console.log("[GARD018 TEST] ====== TEST COMPLETED ======")

    return NextResponse.json({
      testTriggered: true,
      timestamp: nowUTC.toISOString(),
      belgradetime: nowBelgrade.toISOString(),
      searchDate: todayStr,
      totalMembers: allMembers.length,
      expiringToday: expiringToday.length,
      members: allMembers.map((m: any) => ({
        name: `${m.first_name} ${m.last_name}`,
        expiryDate: m.expiry_date,
        expiryDateOnly: m.expiry_date_only,
        status: m.status,
      })),
      expiringMembers: expiringToday.map((m: any) => ({
        name: `${m.first_name} ${m.last_name}`,
        expiryDate: m.expiry_date,
      })),
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
