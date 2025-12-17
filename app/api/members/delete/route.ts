import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { cookies } from "next/headers"

const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(request: NextRequest) {
  try {
    // Check if user is admin
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie) {
      return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)
    const userEmail = session.user?.email

    if (!userEmail) {
      return NextResponse.json({ error: "Niste prijavljeni" }, { status: 401 })
    }

    // Check if user is admin
    const adminCheck = await sql`
      SELECT id FROM admins WHERE email = ${userEmail}
    `

    if (adminCheck.length === 0) {
      return NextResponse.json({ error: "Nemate admin privilegije" }, { status: 403 })
    }

    // Get member ID from request
    const { memberId } = await request.json()

    if (!memberId) {
      return NextResponse.json({ error: "ID člana je obavezan" }, { status: 400 })
    }

    // Delete member
    await sql`
      DELETE FROM members WHERE id = ${memberId}
    `

    return NextResponse.json({ success: true, message: "Član uspešno obrisan" })
  } catch (error) {
    console.error("[v0] Error deleting member:", error)
    return NextResponse.json({ error: "Greška pri brisanju člana" }, { status: 500 })
  }
}
