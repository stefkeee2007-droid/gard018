import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/auth-helpers"

const sql = neon(process.env.DATABASE_URL!)

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await checkAdminAuth()
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error || "Nemate pristup" }, { status: auth.isAuthenticated ? 403 : 401 })
    }

    const memberId = Number.parseInt(params.id)
    if (isNaN(memberId)) {
      return NextResponse.json({ error: "Nevažeći ID člana" }, { status: 400 })
    }

    const body = await request.json()
    const { expiry_date } = body

    console.log("[v0] PATCH request received:", { memberId, expiry_date, body })

    if (!expiry_date) {
      return NextResponse.json({ error: "Datum isteka je obavezan" }, { status: 400 })
    }

    if (!isValidDate(expiry_date)) {
      console.log("[v0] Invalid date detected:", expiry_date)
      return NextResponse.json({ error: "Nevažeći datum isteka" }, { status: 400 })
    }

    const expiryDateObj = new Date(expiry_date + "T00:00:00")
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    console.log("[v0] Date comparison:", {
      expiryDate: expiryDateObj.toISOString(),
      today: today.toISOString(),
      expiryTime: expiryDateObj.getTime(),
      todayTime: today.getTime(),
    })

    const newStatus = expiryDateObj >= today ? "active" : "expired"

    console.log("[v0] Updating member with new status:", { memberId, expiry_date, newStatus })

    await sql`
      UPDATE members
      SET expiry_date = ${expiry_date}, status = ${newStatus}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${memberId}
    `

    console.log("[v0] Member expiry date updated successfully")

    return NextResponse.json({
      success: true,
      status: newStatus,
      expiry_date,
      message: "Datum isteka je uspešno ažuriran",
    })
  } catch (error) {
    console.error("[v0] Error updating member expiry date:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: "Greška pri ažuriranju datuma isteka" }, { status: 500 })
  }
}
