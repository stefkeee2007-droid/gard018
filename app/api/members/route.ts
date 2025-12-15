import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const members = await sql`
      SELECT id, first_name, last_name, email, start_date, expiry_date, status, created_at
      FROM members
      ORDER BY expiry_date ASC
    `
    return NextResponse.json(members)
  } catch (error) {
    console.error("[v0] Error fetching members:", error)
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email, startDate } = await request.json()

    // Calculate expiry date (same day next month)
    const start = new Date(startDate)
    const expiry = new Date(start)
    expiry.setMonth(expiry.getMonth() + 1)

    // Insert new member
    await sql`
      INSERT INTO members (first_name, last_name, email, start_date, expiry_date, status)
      VALUES (${firstName}, ${lastName}, ${email}, ${startDate}, ${expiry.toISOString().split("T")[0]}, 'active')
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error adding member:", error)
    return NextResponse.json({ success: false, error: "Failed to add member" }, { status: 500 })
  }
}
