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

    const { expiry_date } = await request.json()

    if (!expiry_date) {
      return NextResponse.json({ error: "Datum isteka je obavezan" }, { status: 400 })
    }

    if (!isValidDate(expiry_date)) {
      return NextResponse.json({ error: "Nevažeći datum isteka" }, { status: 400 })
    }

    // Calculate status based on expiry date
    const expiryDateObj = new Date(expiry_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expiryDateObj.setHours(0, 0, 0, 0)

    const newStatus = expiryDateObj >= today ? "active" : "expired"

    await sql`
      UPDATE members
      SET expiry_date = ${expiry_date}, status = ${newStatus}
      WHERE id = ${memberId}
    `

    console.log("[v0] Member expiry date updated:", { memberId, expiry_date, newStatus })

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error) {
    console.error("[v0] Error updating member expiry date:", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json({ error: "Greška pri ažuriranju datuma isteka" }, { status: 500 })
  }
}
