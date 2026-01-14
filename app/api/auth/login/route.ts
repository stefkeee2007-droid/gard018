import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { sql } from "@/lib/db-singleton" // Use singleton DB connection
import bcrypt from "bcryptjs"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

const loginLimiter = rateLimit({
  limit: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
})

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

async function hashPasswordSHA256(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const rateLimitResult = await loginLimiter(ip)

    if (!rateLimitResult.success) {
      console.log("[v0] Login rate limit exceeded for IP:", ip)
      return rateLimitResponse(rateLimitResult.reset)
    }

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
      SELECT id, email, first_name, last_name, password_hash, password_hash_type
      FROM users 
      WHERE email = ${sanitizedEmail}
    `

    if (user.length === 0) {
      return NextResponse.json({ error: "Pogrešna lozinka ili email. Pokušajte ponovo." }, { status: 401 })
    }

    const userData = user[0]
    let passwordMatch = false

    if (userData.password_hash_type === "sha256") {
      // Legacy SHA-256 verification
      const hashedPassword = await hashPasswordSHA256(password)
      passwordMatch = hashedPassword === userData.password_hash

      if (passwordMatch) {
        try {
          const newBcryptHash = await bcrypt.hash(password, 10)
          await sql`
            UPDATE users 
            SET password_hash = ${newBcryptHash}, 
                password_hash_type = 'bcrypt'
            WHERE id = ${userData.id}
          `
          console.log(`[v0] User ${sanitizedEmail} auto-migrated from SHA-256 to bcrypt`)
        } catch (migrationError) {
          console.error("[v0] Failed to auto-migrate password hash:", {
            userId: userData.id,
            error: migrationError instanceof Error ? migrationError.message : "Unknown error",
          })
          // Don't fail login if migration fails - user can still log in with SHA-256
        }
      }
    } else {
      // Modern bcrypt verification
      passwordMatch = await bcrypt.compare(password, userData.password_hash)
    }

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
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    cookieStore.set("session", JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
      expires: thirtyDaysFromNow, // Explicit expiry date ensures session persists after browser close
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
