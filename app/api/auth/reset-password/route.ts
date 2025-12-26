import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

const sql = neon(process.env.DATABASE_URL!)

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

    if (password.length > 128) {
      return NextResponse.json({ error: "Lozinka je predugačka" }, { status: 400 })
    }

    const sanitizedToken = token.trim()

    // Find token in database
    const tokens = await sql`
      SELECT email, expiry_date, used 
      FROM password_reset_tokens 
      WHERE token = ${sanitizedToken}
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

    const passwordHash = await bcrypt.hash(password, 10)

    try {
      // Update user password with bcrypt hash and set hash type
      await sql`
        UPDATE users 
        SET password_hash = ${passwordHash},
            password_hash_type = 'bcrypt'
        WHERE email = ${resetToken.email}
      `

      // Mark token as used
      await sql`
        UPDATE password_reset_tokens 
        SET used = true 
        WHERE token = ${sanitizedToken}
      `

      console.log("[v0] Password successfully reset for:", resetToken.email)
    } catch (dbError) {
      console.error("[v0] Database error during password reset:", {
        email: resetToken.email,
        error: dbError instanceof Error ? dbError.message : "Unknown error",
      })
      return NextResponse.json({ error: "Greška pri ažuriranju lozinke" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Reset password error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: "Greška pri resetovanju lozinke" }, { status: 500 })
  }
}
