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

    const users = await sql`
      SELECT id, email, reset_token, reset_token_expiry
      FROM users
      WHERE reset_token IS NOT NULL 
      AND reset_token_expiry > NOW()
    `

    let matchedUser = null

    for (const user of users) {
      const isMatch = await bcrypt.compare(sanitizedToken, user.reset_token)
      if (isMatch) {
        matchedUser = user
        break
      }
    }

    if (!matchedUser) {
      return NextResponse.json({ error: "Nevažeći ili istekao token" }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    try {
      await sql`
        UPDATE users 
        SET password_hash = ${passwordHash},
            password_hash_type = 'bcrypt',
            reset_token = NULL,
            reset_token_expiry = NULL
        WHERE id = ${matchedUser.id}
      `

      console.log("[v0] Password successfully reset for:", matchedUser.email)
    } catch (dbError) {
      console.error("[v0] Database error during password reset:", {
        email: matchedUser.email,
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
