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

    if (!email) {
      return NextResponse.json({ error: "Email je obavezan" }, { status: 400 })
    }

    // Check if user exists
    const users = await sql`SELECT id, first_name, last_name FROM users WHERE email = ${email}`

    if (users.length === 0) {
      // For security, return success even if user doesn't exist
      return NextResponse.json({ success: true })
    }

    const user = users[0]

    // Generate token and set expiry (1 hour from now)
    const token = generateToken()
    const expiryDate = new Date()
    expiryDate.setHours(expiryDate.getHours() + 1)

    // Save token to database
    await sql`
      INSERT INTO password_reset_tokens (email, token, expiry_date)
      VALUES (${email}, ${token}, ${expiryDate.toISOString()})
    `

    // Create reset link
    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/reset-password?token=${token}`

    // Send email via Resend
    try {
      await resend.emails.send({
        from: "GARD 018 Borilački Klub <onboarding@resend.dev>",
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
                .header { background: linear-gradient(135deg, #8f1528 0%, #6b0f1e 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f9f9f9; padding: 30px 20px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #8f1528; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 28px;">GARD 018</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Borilački Klub</p>
                </div>
                <div class="content">
                  <p>Poštovani ${user.first_name} ${user.last_name},</p>
                  
                  <p>Primili smo zahtev za resetovanje vaše lozinke. Kliknite na dugme ispod da kreirate novu lozinku:</p>
                  
                  <div style="text-align: center;">
                    <a href="${resetLink}" class="button">Resetuj lozinku</a>
                  </div>
                  
                  <p>Ili kopirajte i nalepite ovaj link u vaš pretraživač:</p>
                  <p style="background: white; padding: 15px; border-radius: 5px; word-break: break-all; border: 1px solid #ddd;">
                    ${resetLink}
                  </p>
                  
                  <p style="color: #8f1528; font-weight: bold;">⚠️ Ovaj link ističe za 1 sat.</p>
                  
                  <p>Ako niste zatražili resetovanje lozinke, zanemarite ovaj email. Vaša lozinka će ostati nepromenjena.</p>
                  
                  <div class="footer">
                    <p><strong>GARD 018 Borilački Klub</strong></p>
                    <p>Svetozara Miletića 10, Niš 18000</p>
                    <p>📞 069 010 5213 | 📧 ognjen.boks19@gmail.com</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
      })
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
