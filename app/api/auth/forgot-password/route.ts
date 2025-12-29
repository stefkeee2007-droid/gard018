import { NextResponse } from "next/server"
import { Resend } from "resend"
import { sql } from "@vercel/postgres"
import crypto from "node:crypto"

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().substring(0, 255)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email je obavezan" }, { status: 400 })
    }

    const sanitizedEmail = sanitizeEmail(email)

    if (!isValidEmail(sanitizedEmail)) {
      return NextResponse.json({ error: "Nevažeći email format" }, { status: 400 })
    }

    console.log("[v0] Forgot password request for:", sanitizedEmail)

    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey || !apiKey.startsWith("re_")) {
      console.error("[v0] KRITIČNA GREŠKA: RESEND_API_KEY nije postavljen ili je nevažeći!")
      return NextResponse.json({ error: "Server nije pravilno konfigurisan" }, { status: 500 })
    }

    const resend = new Resend(apiKey)

    let result
    try {
      result = await sql`SELECT id, email FROM users WHERE email = ${sanitizedEmail}`
    } catch (dbError) {
      console.error("[v0] Database error while finding user:", dbError)
      return NextResponse.json({ error: "Greška pri pristupu bazi podataka" }, { status: 500 })
    }

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Ako nalog postoji, link za resetovanje je poslat na email",
      })
    }

    const userId = result.rows[0].id
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 3600000).toISOString() // 1 sat

    console.log("[v0] Token generated, saving to database...")

    try {
      await sql`
        INSERT INTO password_resets (user_id, token, expires_at)
        VALUES (${userId}, ${token}, ${expiresAt})
      `
    } catch (dbError) {
      console.error("[v0] Database error while saving token:", dbError)
      return NextResponse.json({ error: "Greška pri generisanju linka za resetovanje" }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const resetLink = `${baseUrl}/reset-password?token=${token}`

    console.log("[v0] Sending email via Resend...")

    try {
      const { data, error } = await resend.emails.send({
        from: "GARD 018 <onboarding@resend.dev>",
        to: sanitizedEmail,
        subject: "Resetovanje lozinke - GARD 018",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">Resetovanje lozinke</h2>
            <p>Zatražili ste resetovanje lozinke za vaš GARD 018 nalog.</p>
            <p>Kliknite na dugme ispod da resetujete lozinku:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="display: inline-block; background-color: #ef4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Resetuj lozinku
              </a>
            </div>
            <p>Ili kopirajte ovaj link u pretraživač:</p>
            <p style="word-break: break-all; color: #666; background: #f5f5f5; padding: 10px; border-radius: 4px;">${resetLink}</p>
            <p style="color: #ef4444;"><strong>⚠️ Link ističe za 1 sat.</strong></p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 14px;">Ako niste tražili resetovanje lozinke, možete ignorisati ovaj email. Vaša lozinka neće biti promenjena.</p>
          </div>
        `,
      })

      if (error) {
        console.error("[v0] Resend API error:", error)
        return NextResponse.json({ error: "Greška pri slanju emaila" }, { status: 500 })
      }

      if (!data?.id) {
        console.error("[v0] Resend returned no email ID")
        return NextResponse.json({ error: "Email nije uspešno poslat" }, { status: 500 })
      }

      console.log("[v0] Email sent successfully! Email ID:", data.id)

      return NextResponse.json({
        success: true,
        message: "Link za resetovanje lozinke je poslat na vaš email",
      })
    } catch (emailError: any) {
      console.error("[v0] Error sending email:", emailError)
      return NextResponse.json({ error: "Neuspelo slanje emaila" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[v0] Unexpected error in forgot-password:", error)
    return NextResponse.json({ error: "Interna greška servera" }, { status: 500 })
  }
}
