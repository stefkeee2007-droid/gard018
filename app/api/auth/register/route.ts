import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName } = body

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: "Sva polja su obavezna" }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Nevažeća email adresa" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Lozinka mora imati najmanje 8 karaktera" }, { status: 400 })
    }

    const sanitizedEmail = sanitizeInput(email.toLowerCase())
    const sanitizedFirstName = sanitizeInput(firstName)
    const sanitizedLastName = sanitizeInput(lastName)

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${sanitizedEmail}
    `

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "Korisnik sa ovom email adresom već postoji" }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Insert new user with hashed password
    await sql`
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES (${sanitizedEmail}, ${passwordHash}, ${sanitizedFirstName}, ${sanitizedLastName})
    `

    // Create session
    const session = {
      user: {
        email: sanitizedEmail,
        name: `${sanitizedFirstName} ${sanitizedLastName}`,
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(sanitizedFirstName + " " + sanitizedLastName)}&background=8f1528&color=fff`,
      },
    }

    const cookieStore = await cookies()
    cookieStore.set("session", JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    })

    console.log("[v0] User registered successfully:", sanitizedEmail)

    return NextResponse.json({ success: true, user: session.user })
  } catch (error) {
    console.error("[v0] Registration error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: "Greška pri registraciji. Molimo pokušajte ponovo." }, { status: 500 })
  }
}
