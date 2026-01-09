import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/auth-helpers"

const sql = neon(process.env.DATABASE_URL!)

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, "").slice(0, 255)
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

export async function GET() {
  try {
    const auth = await checkAdminAuth()
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error || "Nemate pristup" }, { status: auth.isAuthenticated ? 403 : 401 })
    }

    const members = await sql`
      SELECT id, first_name, last_name, email, start_date, expiry_date, status, membership_type, created_at
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
    const auth = await checkAdminAuth()
    if (!auth.isAdmin) {
      return NextResponse.json({ error: auth.error || "Nemate pristup" }, { status: auth.isAuthenticated ? 403 : 401 })
    }

    const { first_name, last_name, email, start_date, expiry_date } = await request.json()

    if (!first_name || !last_name || !email || !start_date || !expiry_date) {
      return NextResponse.json({ success: false, error: "Sva polja su obavezna" }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, error: "Nevažeća email adresa" }, { status: 400 })
    }

    if (!isValidDate(start_date)) {
      return NextResponse.json({ success: false, error: "Nevažeći datum početka" }, { status: 400 })
    }

    if (!isValidDate(expiry_date)) {
      return NextResponse.json({ success: false, error: "Nevažeći datum isteka" }, { status: 400 })
    }

    const startDateObj = new Date(start_date)
    const expiryDateObj = new Date(expiry_date)
    if (expiryDateObj <= startDateObj) {
      return NextResponse.json(
        { success: false, error: "Datum isteka mora biti posle datuma početka" },
        { status: 400 },
      )
    }

    const sanitizedFirstName = sanitizeInput(first_name)
    const sanitizedLastName = sanitizeInput(last_name)
    const sanitizedEmail = sanitizeInput(email.toLowerCase())

    const existingMember = await sql`
      SELECT id FROM members WHERE email = ${sanitizedEmail}
    `

    if (existingMember.length > 0) {
      return NextResponse.json({ success: false, error: "Član sa ovom email adresom već postoji" }, { status: 400 })
    }

    await sql`
      INSERT INTO members (first_name, last_name, email, start_date, expiry_date, membership_type, status)
      VALUES (
        ${sanitizedFirstName}, 
        ${sanitizedLastName}, 
        ${sanitizedEmail}, 
        ${start_date}, 
        ${expiry_date}, 
        'MANUAL',
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
