import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

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
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email i lozinka su obavezni" }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)
    const user = await sql`
      SELECT id, email, first_name, last_name 
      FROM users 
      WHERE email = ${email} AND password_hash = ${passwordHash}
    `

    if (user.length === 0) {
      return NextResponse.json({ error: "Pogrešna lozinka ili email. Pokušajte ponovo." }, { status: 401 })
    }

    const userData = user[0]
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

    return NextResponse.json({ success: true, user: session.user })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Greška pri prijavi" }, { status: 500 })
  }
}
