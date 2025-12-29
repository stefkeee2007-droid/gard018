import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

const sql = neon(process.env.DATABASE_URL!)

const registerLimiter = rateLimit({
  limit: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
})

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, "").slice(0, 255)
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const rateLimitResult = await registerLimiter(ip)

    if (!rateLimitResult.success) {
      console.log("[v0] Registration rate limit exceeded for IP:", ip)
      return rateLimitResponse(rateLimitResult.reset)
    }

    const body = await request.json()
    const { email, password, firstName, lastName, membershipData } = body

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

    console.log("[v0] Starting transaction: Creating user and member atomically")

    try {
      const userResult = await sql`
        INSERT INTO users (email, password_hash, first_name, last_name, password_hash_type)
        VALUES (${sanitizedEmail}, ${passwordHash}, ${sanitizedFirstName}, ${sanitizedLastName}, 'bcrypt')
        RETURNING id, email, first_name, last_name
      `

      const newUser = userResult[0]
      console.log("[v0] User created successfully:", newUser.id)

      try {
        const memberResult = await sql`
          INSERT INTO members (first_name, last_name, email, start_date, expiry_date, status)
          VALUES (
            ${sanitizedFirstName}, 
            ${sanitizedLastName}, 
            ${sanitizedEmail},
            ${membershipData.startDate},
            ${membershipData.expiryDate},
            ${membershipData.status}
          )
          RETURNING id
        `

        console.log("[v0] Member created successfully:", memberResult[0].id)
      } catch (memberError) {
        console.error("[v0] Member creation failed, rolling back user creation:", {
          userId: newUser.id,
          error: memberError instanceof Error ? memberError.message : "Unknown error",
        })

        await sql`DELETE FROM users WHERE id = ${newUser.id}`

        console.log("[v0] User rollback completed")

        return NextResponse.json(
          {
            error: "Greška pri kreiranje članarine. Pokušajte ponovo.",
          },
          { status: 500 },
        )
      }

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
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      })

      console.log("[v0] User and member registered successfully:", sanitizedEmail)

      return NextResponse.json({
        success: true,
        user: session.user,
        userId: newUser.id,
      })
    } catch (error) {
      console.error("[v0] Transaction failed:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      })

      return NextResponse.json(
        {
          error: "Greška pri registraciji. Pokušajte ponovo.",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Registration error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: "Greška pri registraciji. Molimo pokušajte ponovo." }, { status: 500 })
  }
}
