import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY)

// Generate random token
function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    console.log("[v0] Forgot password request for:", email)

    if (!email) {
      return NextResponse.json({ error: "Email je obavezan" }, { status: 400 })
    }

    // Check if user exists
    const users = await sql`SELECT id, first_name, last_name FROM users WHERE email = ${email}`

    console.log("[v0] User found:", users.length > 0)

    if (users.length === 0) {
      // For security, return success even if user doesn't exist
      return NextResponse.json({ success: true })
    }

    const user = users[0]

    // Generate token and set expiry (1 hour from now)
    const token = generateToken()
    const expiryDate = new Date()
    expiryDate.setHours(expiryDate.getHours() + 1)

    console.log("[v0] Token generated, saving to database...")

    // Save token to database
    await sql`
      INSERT INTO password_reset_tokens (email, token, expiry_date)
      VALUES (${email}, ${token}, ${expiryDate.toISOString()})
    `

    // Create reset link
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/reset-password?token=${token}`

    console.log("[v0] Sending email via Resend...")

    // Send email via Resend
    try {
      const result = await resend.emails.send({
        from: "GARD 018 <onboarding@resend.dev>",
        to: email,
        replyTo: "ognjen.boks19@gmail.com",
        subject: "Resetovanje lozinke - GARD 018",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    
    <div style="background-color: #8f1528; padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">GARD 018</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Borilački Klub</p>
    </div>
    
    <div style="padding: 40px 30px;">
      <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
        Poštovani ${user.first_name || ""} ${user.last_name || ""},
      </p>
      
      <p style="font-size: 15px; color: #555555; line-height: 1.6; margin: 0 0 30px 0;">
        Primili smo vaš zahtev za resetovanje lozinke. Kliknite na dugme ispod da biste postavili novu lozinku.
      </p>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${resetLink}" style="display: inline-block; background-color: #8f1528; color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 5px; font-size: 16px; font-weight: bold;">
          Resetuj lozinku
        </a>
      </div>
      
      <p style="font-size: 14px; color: #666666; line-height: 1.6; margin: 30px 0 15px 0;">
        Ako dugme ne radi, kopirajte sledeći link u vaš pretraživač:
      </p>
      
      <div style="background-color: #f9f9f9; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 13px; color: #8f1528; margin: 0 0 25px 0;">
        ${resetLink}
      </div>
      
      <div style="background-color: #fff9e6; border-left: 4px solid #ff9800; padding: 12px; margin: 0 0 25px 0;">
        <p style="font-size: 14px; color: #e65100; margin: 0;">
          <strong>Napomena:</strong> Link ističe za 1 sat.
        </p>
      </div>
      
      <p style="font-size: 14px; color: #777777; line-height: 1.6; margin: 0;">
        Ako niste zatražili resetovanje lozinke, možete ignorisati ovaj email.
      </p>
    </div>
    
    <div style="background-color: #f9f9f9; padding: 25px; text-align: center; border-top: 1px solid #e5e5e5;">
      <p style="font-size: 13px; color: #666666; margin: 0 0 5px 0;">
        GARD 018 Borilački Klub
      </p>
      <p style="font-size: 12px; color: #999999; margin: 0 0 3px 0;">
        Svetozara Miletića 10, Niš 18000
      </p>
      <p style="font-size: 12px; color: #999999; margin: 0;">
        Telefon: 069 010 5213
      </p>
    </div>
    
  </div>
</body>
</html>
        `,
      })

      console.log("[v0] Resend result:", result)
    } catch (emailError) {
      console.error("[v0] Resend email error:", emailError)
      return NextResponse.json({ error: "Greška pri slanju email-a" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Forgot password error:", error)
    return NextResponse.json({ error: "Greška pri obradi zahteva" }, { status: 500 })
  }
}
