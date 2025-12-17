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
        from: "GARD 018 Borilacki Klub <onboarding@resend.dev>",
        to: email,
        reply_to: "ognjen.boks19@gmail.com",
        subject: "Resetovanje lozinke za vas nalog",
        headers: {
          "X-Entity-Ref-ID": `password-reset-${token.substring(0, 8)}`,
        },
        html: `
          <!DOCTYPE html>
          <html lang="sr">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <meta name="x-apple-disable-message-reformatting">
              <title>Resetovanje lozinke</title>
              <!--[if mso]>
              <style type="text/css">
                body, table, td {font-family: Arial, sans-serif !important;}
              </style>
              <![endif]-->
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
              <!-- Preheader text -->
              <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
                Zatrazili ste resetovanje lozinke za vas nalog. Link vazi 1 sat.
              </div>
              
              <!-- Email Container -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
                <tr>
                  <td style="padding: 40px 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                      
                      <!-- Header -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #8f1528 0%, #6b0f1e 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                          <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 1px;">GARD 018</h1>
                          <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Borilacki Klub</p>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px 30px;">
                          <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                            Postovani ${user.first_name || ""} ${user.last_name || ""},
                          </p>
                          
                          <p style="margin: 0 0 25px 0; color: #555555; font-size: 15px; line-height: 1.6;">
                            Primili smo vas zahtev za resetovanje lozinke. Kliknite na dugme ispod da biste postavili novu lozinku za vas nalog.
                          </p>
                          
                          <!-- CTA Button -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="text-align: center; padding: 10px 0 30px 0;">
                                <a href="${resetLink}" 
                                   style="display: inline-block; background-color: #8f1528; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">
                                  Resetuj lozinku
                                </a>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 0 0 15px 0; color: #555555; font-size: 14px; line-height: 1.6;">
                            Ako dugme ne radi, kopirajte i nalepite sledeci link u vas pretrazivac:
                          </p>
                          
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 25px 0;">
                            <tr>
                              <td style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; border: 1px solid #e5e5e5;">
                                <a href="${resetLink}" style="color: #8f1528; text-decoration: none; word-break: break-all; font-size: 13px;">
                                  ${resetLink}
                                </a>
                              </td>
                            </tr>
                          </table>
                          
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 25px 0; background-color: #fff9f0; border-left: 4px solid #ff9800; border-radius: 4px;">
                            <tr>
                              <td style="padding: 15px;">
                                <p style="margin: 0; color: #d84315; font-size: 14px; line-height: 1.5;">
                                  <strong>Napomena:</strong> Ovaj link istice za 1 sat iz bezbednosnih razloga.
                                </p>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                            Ako niste zatrazili resetovanje lozinke, mozete slobodno ignorisati ovaj mejl. Vasa lozinka ce ostati nepromenjena.
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="padding: 30px; background-color: #f9f9f9; border-top: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="text-align: center;">
                                <p style="margin: 0 0 10px 0; color: #333333; font-size: 15px; font-weight: 600;">
                                  GARD 018 Borilacki Klub
                                </p>
                                <p style="margin: 0 0 5px 0; color: #666666; font-size: 13px; line-height: 1.5;">
                                  Svetozara Miletica 10, Nis 18000
                                </p>
                                <p style="margin: 0 0 15px 0; color: #666666; font-size: 13px; line-height: 1.5;">
                                  Telefon: 069 010 5213
                                </p>
                                <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                                  Ova poruka je poslata sa sajta GARD 018 Borilackog Kluba na vas zahtev.<br>
                                  Ako niste zatrazili reset lozinke, ignoriste ovaj mejl.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      })
    } catch (emailError) {
      console.error("[v0] Resend email error:", emailError)
      return NextResponse.json({ error: "Greska pri slanju email-a" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Forgot password error:", error)
    return NextResponse.json({ error: "Greska pri obradi zahteva" }, { status: 500 })
  }
}
