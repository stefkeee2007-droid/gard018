import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

const sql = neon(process.env.DATABASE_URL!)

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email i lozinka su obavezni" }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Nevažeća email adresa" }, { status: 400 })
    }

    const sanitizedEmail = email.toLowerCase().trim()

    const user = await sql`
      SELECT id, email, first_name, last_name, password_hash
      FROM users 
      WHERE email = ${sanitizedEmail}
    `

    if (user.length === 0) {
      return NextResponse.json({ error: "Pogrešna lozinka ili email. Pokušajte ponovo." }, { status: 401 })
    }

    const userData = user[0]

    const passwordMatch = await bcrypt.compare(password, userData.password_hash)

    if (!passwordMatch) {
      return NextResponse.json({ error: "Pogrešna lozinka ili email. Pokušajte ponovo." }, { status: 401 })
    }

    const session = {
      user: {
        email: userData.email,
        name: `${userData.first_name} ${userData.last_name}`,
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.first_name + " " + userData.last_name)}&background=8f1528&color=fff`,
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

    console.log("[v0] User logged in successfully:", sanitizedEmail)

    return NextResponse.json({ success: true, user: session.user })
  } catch (error) {
    console.error("[v0] Login error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: "Greška pri prijavi. Molimo pokušajte ponovo." }, { status: 500 })
  }
}
