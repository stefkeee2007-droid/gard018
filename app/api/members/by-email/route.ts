import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie) {
      return NextResponse.json({ membership: null })
    }

    const session = JSON.parse(sessionCookie.value)
    const userEmail = session.email

    const result = await sql`
      SELECT id, first_name, last_name, email, start_date, expiry_date, status
      FROM members
      WHERE email = ${userEmail}
      LIMIT 1
    `

    if (result.length === 0) {
      return NextResponse.json({ membership: null })
    }

    return NextResponse.json({ membership: result[0] })
  } catch (error) {
    console.error("Error fetching membership:", error)
    return NextResponse.json({ membership: null }, { status: 500 })
  }
}
