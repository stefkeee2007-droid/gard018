import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove < and > characters
    .slice(0, 255) // Limit length
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

export async function GET() {
  try {
    const members = await sql`
      SELECT id, first_name, last_name, email, start_date, expiry_date, status, created_at
      FROM members
      ORDER BY expiry_date ASC
    `
    return NextResponse.json(members)
  } catch (error) {
    console.error("[v0] Error fetching members:", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email, startDate } = await request.json()

    if (!firstName || !lastName || !email || !startDate) {
      return NextResponse.json({ success: false, error: "Sva polja su obavezna" }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: "Nevažeća email adresa" }, { status: 400 })
    }

    if (!isValidDate(startDate)) {
      return NextResponse.json({ success: false, error: "Nevažeći datum" }, { status: 400 })
    }

    const sanitizedFirstName = sanitizeInput(firstName)
    const sanitizedLastName = sanitizeInput(lastName)
    const sanitizedEmail = sanitizeInput(email.toLowerCase())

    const existingMember = await sql`
      SELECT id FROM members WHERE email = ${sanitizedEmail}
    `

    if (existingMember.length > 0) {
      return NextResponse.json({ success: false, error: "Član sa ovom email adresom već postoji" }, { status: 400 })
    }

    // Calculate expiry date (same day next month)
    const start = new Date(startDate)
    const expiry = new Date(start)
    expiry.setMonth(expiry.getMonth() + 1)

    // Insert new member with sanitized data
    await sql`
      INSERT INTO members (first_name, last_name, email, start_date, expiry_date, status)
      VALUES (
        ${sanitizedFirstName}, 
        ${sanitizedLastName}, 
        ${sanitizedEmail}, 
        ${startDate}, 
        ${expiry.toISOString().split("T")[0]}, 
        'active'
      )
    `

    console.log("[v0] Member added successfully:", sanitizedEmail)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error adding member:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { success: false, error: "Greška pri dodavanju člana. Molimo pokušajte ponovo." },
      { status: 500 },
    )
  }
}
