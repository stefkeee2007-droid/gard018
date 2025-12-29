import { NextResponse } from "next/server"
import { Resend } from "resend"
import { sql } from "@vercel/postgres"
import crypto from "node:crypto"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email } = body

    console.log("[v0] Forgot password request for:", email)

    // Primary: Environment variable (after you update it in Vercel)
    // Fallback: Hardcoded key (TEMPORARY - update env vars ASAP)
    const apiKey = process.env.RESEND_API_KEY || "re_c1tpEyD8_NKFusih9vKVQknRAQfmFcWCv"

    console.log(
      "[v0] Debug Resend Key:",
      apiKey ? `Postoji (dužina: ${apiKey.length}, prefix: ${apiKey.substring(0, 5)}...)` : "NEDOSTAJE/UNDEFINED",
    )

    if (!apiKey || !apiKey.startsWith("re_")) {
      console.error("[v0] KRITIČNA GREŠKA: API ključ nije validnog formata!")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const resend = new Resend(apiKey)

    const result = await sql`SELECT id, email FROM users WHERE email = ${email}`

    console.log("[v0] User found:", result.rows.length > 0)

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Korisnik sa ovim email-om ne postoji" }, { status: 404 })
    }

    const userId = result.rows[0].id
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 3600000).toISOString()

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
    const resetLink = `${baseUrl}/reset/reset-password?token=${token}`

    console.log("[v0] Sending email via Resend...")
    console.log("[v0] Reset link:", resetLink)

    try {
      const { data, error } = await resend.emails.send({
        from: "GARD 018 <onboarding@resend.dev>",
        to: email,
        subject: "Resetovanje lozinke - GARD 018",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Resetovanje lozinke</h2>
            <p>Zatražili ste resetovanje lozinke za vaš GARD 018 nalog.</p>
            <p>Kliknite na dugme ispod da resetujete lozinku:</p>
            <a href="${resetLink}" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
              Resetuj lozinku
            </a>
            <p>Ili kopirajte ovaj link u pretraživač:</p>
            <p style="word-break: break-all; color: #666;">${resetLink}</p>
            <p><strong>Link ističe za 1 sat.</strong></p>
            <p>Ako niste tražili resetovanje lozinke, možete ignorisati ovaj email.</p>
          </div>
        `,
      })

      if (error) {
        console.error("[v0] ❌ Resend API vratio grešku:", error.message)
        return NextResponse.json({ error: `Greška pri slanju emaila: ${error.message}` }, { status: 500 })
      }

      if (!data?.id) {
        console.error("[v0] Resend returned no email ID:", { data, error })
        return NextResponse.json({ error: "Email nije uspešno poslat - nema ID-a" }, { status: 500 })
      }

      console.log("[v0] ✅ Email poslat uspešno! Email ID:", data.id)

      return NextResponse.json({
        success: true,
        message: "Link za resetovanje lozinke je poslat na vaš email",
      })
    } catch (emailError: any) {
      console.error("[v0] ❌ Greška pri slanju emaila:", emailError)
      return NextResponse.json({ error: `Neuspelo slanje emaila: ${emailError.message}` }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[v0] ❌ Neočekivana greška u forgot-password:", error)
    return NextResponse.json({ error: "Interna greška servera" }, { status: 500 })
  }
}
