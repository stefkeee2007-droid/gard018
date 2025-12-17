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
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json({ error: "Token i lozinka su obavezni" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Lozinka mora imati najmanje 8 karaktera" }, { status: 400 })
    }

    // Find token in database
    const tokens = await sql`
      SELECT email, expiry_date, used 
      FROM password_reset_tokens 
      WHERE token = ${token}
    `

    if (tokens.length === 0) {
      return NextResponse.json({ error: "Nevažeći token" }, { status: 400 })
    }

    const resetToken = tokens[0]

    // Check if token is expired
    if (new Date(resetToken.expiry_date) < new Date()) {
      return NextResponse.json({ error: "Token je istekao" }, { status: 400 })
    }

    // Check if token was already used
    if (resetToken.used) {
      return NextResponse.json({ error: "Token je već iskorišćen" }, { status: 400 })
    }

    // Hash new password and update user
    const passwordHash = await hashPassword(password)
    await sql`
      UPDATE users 
      SET password_hash = ${passwordHash}
      WHERE email = ${resetToken.email}
    `

    // Mark token as used
    await sql`
      UPDATE password_reset_tokens 
      SET used = true 
      WHERE token = ${token}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Reset password error:", error)
    return NextResponse.json({ error: "Greška pri resetovanju lozinke" }, { status: 500 })
  }
}
