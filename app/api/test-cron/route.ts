import { NextResponse } from "next/server"
import { sql } from "@/lib/db-singleton"
import { processMembershipExpirations } from "@/lib/membership-service"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  console.log("[GARD018 TEST] ====== MANUAL CRON TEST TRIGGERED ======")

  try {
    const nowUTC = new Date()
    const UTC_OFFSET_MS = 1 * 60 * 60 * 1000 // CET = UTC+1
    const nowBelgrade = new Date(nowUTC.getTime() + UTC_OFFSET_MS)

    const todayStr = nowBelgrade.toISOString().split("T")[0]
    const in3DaysDate = new Date(nowBelgrade.getTime() + 3 * 24 * 60 * 60 * 1000)
    const in3DaysStr = in3DaysDate.toISOString().split("T")[0]

    console.log("[GARD018 TEST] Server UTC time:", nowUTC.toISOString())
    console.log("[GARD018 TEST] Belgrade time (UTC+1):", nowBelgrade.toISOString())
    console.log("[GARD018 TEST] Today date string:", todayStr)
    console.log("[GARD018 TEST] In 3 days date string:", in3DaysStr)

    console.log("[GARD018 TEST] Fetching ALL members from database...")
    const allMembers = await sql`
      SELECT id, first_name, last_name, email, 
             expiry_date, 
             status
      FROM members
      ORDER BY expiry_date ASC
    `

    console.log(`[GARD018 TEST] Total members in database: ${allMembers.length}`)
    allMembers.forEach((m: any) => {
      const expiryStr = m.expiry_date.toISOString ? m.expiry_date.toISOString() : String(m.expiry_date)
      const expiryDateOnly = expiryStr.split("T")[0]
      console.log(
        `  - ${m.first_name} ${m.last_name}: expiry=${expiryStr}, date_only=${expiryDateOnly}, status=${m.status}`,
      )
    })

    // This avoids timezone issues with SQL timestamp comparisons
    const expiringToday = allMembers.filter((m: any) => {
      const expiryStr = m.expiry_date.toISOString ? m.expiry_date.toISOString() : String(m.expiry_date)
      const expiryDateOnly = expiryStr.split("T")[0]
      return expiryDateOnly === todayStr && m.status === "active"
    })

    const expiringIn3Days = allMembers.filter((m: any) => {
      const expiryStr = m.expiry_date.toISOString ? m.expiry_date.toISOString() : String(m.expiry_date)
      const expiryDateOnly = expiryStr.split("T")[0]
      return expiryDateOnly === in3DaysStr && m.status === "active"
    })

    console.log(`[GARD018 TEST] Found ${expiringToday.length} members expiring TODAY (${todayStr})`)
    expiringToday.forEach((m: any) => {
      console.log(`  ✓ ${m.first_name} ${m.last_name}: ${m.email}`)
    })

    console.log(`[GARD018 TEST] Found ${expiringIn3Days.length} members expiring IN 3 DAYS (${in3DaysStr})`)
    expiringIn3Days.forEach((m: any) => {
      console.log(`  ⚠ ${m.first_name} ${m.last_name}: ${m.email}`)
    })

    const result = await processMembershipExpirations()

    console.log("[GARD018 TEST] ====== TEST COMPLETED ======")
    console.log("[GARD018 TEST] Result:", JSON.stringify(result, null, 2))

    return NextResponse.json({
      testTriggered: true,
      timestamp: nowUTC.toISOString(),
      belgradetime: nowBelgrade.toISOString(),
      searchDate: todayStr,
      in3DaysDate: in3DaysStr,
      totalMembers: allMembers.length,
      expiringToday: expiringToday.length,
      expiringIn3Days: expiringIn3Days.length,
      todayMembers: expiringToday.map((m: any) => ({
        name: `${m.first_name} ${m.last_name}`,
        email: m.email,
        expiryDate: m.expiry_date,
      })),
      warningMembers: expiringIn3Days.map((m: any) => ({
        name: `${m.first_name} ${m.last_name}`,
        email: m.email,
        expiryDate: m.expiry_date,
      })),
      result,
    })
  } catch (error) {
    console.error("[GARD018 TEST] ====== TEST FAILED ======")
    console.error("[GARD018 TEST] Error:", error)
    return NextResponse.json(
      {
        success: false,
        testTriggered: false,
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
