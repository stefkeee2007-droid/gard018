import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Simple password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email i lozinka su obavezni" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Lozinka mora imati najmanje 8 karaktera" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existingUser.length > 0) {
      return NextResponse.json({ error: "Korisnik sa ovom email adresom već postoji" }, { status: 400 })
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password)
    await sql`
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES (${email}, ${passwordHash}, ${firstName}, ${lastName})
    `

    // Create session
    const session = {
      user: {
        email,
        name: `${firstName} ${lastName}`,
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + " " + lastName)}&background=8f1528&color=fff`,
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

    return NextResponse.json({ success: true, user: session.user })
  } catch (error) {
    console.error("[v0] Registration error:", error)
    return NextResponse.json({ error: "Greška pri registraciji" }, { status: 500 })
  }
}
