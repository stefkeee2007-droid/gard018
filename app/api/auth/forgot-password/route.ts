import { NextResponse } from "next/server"
import { Resend } from "resend"
import { neon } from "@neondatabase/serverless"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

const sql = neon(process.env.DATABASE_URL!)

const forgotPasswordLimiter = rateLimit({
  limit: 3,
  windowMs: 15 * 60 * 1000, // 15 minutes
})

async function hashToken(token: string): Promise<string> {
  return await bcrypt.hash(token, 10)
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    const rateLimitResult = await forgotPasswordLimiter(ip)

    if (!rateLimitResult.success) {
      console.log("[v0] Forgot password rate limit exceeded for IP:", ip)
      return rateLimitResponse(rateLimitResult.reset)
    }

    const body = await req.json()
    let { email } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email je obavezan" }, { status: 400 })
    }

    // Normalize email to lowercase
    email = email.toLowerCase().trim()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Nevažeći email format" }, { status: 400 })
    }

    console.log("[v0] Forgot password request for:", email)

    const users = await sql`
      SELECT id, email, first_name, last_name 
      FROM users 
      WHERE email = ${email}
    `

    if (users.length === 0) {
      // Iz sigurnosnih razloga, ne otkrivamo da korisnik ne postoji
      console.log("[v0] User not found, but returning success to prevent email enumeration")
      return NextResponse.json({
        success: true,
        message: "Ako email postoji u našem sistemu, poslaćemo vam link za resetovanje",
      })
    }

    const user = users[0]

    const resetToken = crypto.randomBytes(32).toString("hex")
    const hashedToken = await hashToken(resetToken)
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 sat od sada

    await sql`
      UPDATE users 
      SET 
        reset_token = ${hashedToken},
        reset_token_expiry = ${resetTokenExpiry.toISOString()}
      WHERE id = ${user.id}
    `

    console.log("[v0] Hashed reset token generated and saved for user:", user.id)

    const apiKey = process.env.RESEND_API_KEY || "re_XoRzT6q9_EKAmAxcohVgrseiQpAghBGRA"

    console.log("[v0] Resend API Key found, length:", apiKey.length)
    console.log("[v0] API Key format check:", {
      startsWithRe: apiKey.startsWith("re_"),
      firstChars: apiKey.substring(0, 5),
      lastChars: apiKey.substring(apiKey.length - 3),
    })

    if (!apiKey.startsWith("re_")) {
      console.error("[v0] API Key ne počinje sa 're_' - ključ je NEVAŽEĆI!")
      return NextResponse.json(
        {
          error: "Resend API ključ nije ispravno konfigurisan. Molimo kontaktirajte administratora.",
        },
        { status: 500 },
      )
    }

    const resend = new Resend(apiKey)

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

    console.log("[v0] Reset URL generated:", resetUrl)

    const emailResult = await resend.emails.send({
      from: "GARD 018 Boks Klub <ognjen.boks19@gmail.com>",
      to: email,
      subject: "Resetovanje lozinke - GARD 018",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 15px 30px; background: #DC2626; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🥊 GARD 018</h1>
                <p>Boks i Kikboks Klub</p>
              </div>
              <div class="content">
                <h2>Zdravo ${user.first_name}!</h2>
                <p>Primili smo zahtev za resetovanje vaše lozinke.</p>
                <p>Kliknite na dugme ispod da biste kreirali novu lozinku:</p>
                <center>
                  <a href="${resetUrl}" class="button">Resetuj lozinku</a>
                </center>
                <p><strong>Link je važeći 1 sat.</strong></p>
                <p>Ako niste vi zatražili resetovanje lozinke, ignorišite ovaj email.</p>
                <p style="font-size: 12px; color: #666; margin-top: 30px;">
                  Ako dugme ne radi, kopirajte sledeći link u pretraživač:<br>
                  <code style="background: #e0e0e0; padding: 5px 10px; border-radius: 3px; word-break: break-all;">${resetUrl}</code>
                </p>
              </div>
              <div class="footer">
                <p>© 2025 GARD 018 Boks i Kikboks Klub. Sva prava zadržana.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    })

    if (emailResult.error) {
      console.error("[v0] Resend API error:", emailResult.error)
      return NextResponse.json({ error: "Greška pri slanju email-a: " + emailResult.error.message }, { status: 500 })
    }

    console.log("[v0] Email successfully sent! ID:", emailResult.data?.id)

    return NextResponse.json({
      success: true,
      message: "Link za resetovanje lozinke je poslat na vašu email adresu",
    })
  } catch (error) {
    console.error("[v0] Unexpected error in forgot-password:", error)
    return NextResponse.json({ error: "Neočekivana greška na serveru" }, { status: 500 })
  }
}
