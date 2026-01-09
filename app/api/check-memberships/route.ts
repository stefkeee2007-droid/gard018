import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"
import { Resend } from "resend"

const sql = neon(process.env.DATABASE_URL!)

const resend = new Resend(process.env.RESEND_API_KEY!)

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const expiringMembers = await sql`
      SELECT id, first_name, last_name, email, expiry_date
      FROM members
      WHERE expiry_date = CURRENT_DATE
      AND status = 'active'
    `

    console.log("[GARD018] Found members expiring today:", expiringMembers.length)

    const notifications = []
    const failed = []

    for (const member of expiringMembers) {
      try {
        const emailsSent = await sendExpiryEmails(member)

        if (emailsSent) {
          await sql`
            UPDATE members
            SET status = 'expired', updated_at = CURRENT_TIMESTAMP
            WHERE id = ${member.id}
          `

          notifications.push({
            member: `${member.first_name} ${member.last_name}`,
            email: member.email,
            expiryDate: member.expiry_date,
          })

          console.log(`[GARD018] Successfully processed ${member.email}`)
        } else {
          failed.push({
            member: `${member.first_name} ${member.last_name}`,
            email: member.email,
            reason: "Email sending failed",
          })
          console.error(`[GARD018] Failed to send email to ${member.email}, database NOT updated`)
        }

        if (expiringMembers.indexOf(member) < expiringMembers.length - 1) {
          console.log("[GARD018] Pauza pre sledećeg slanja... (500ms)")
          await sleep(500)
        }
      } catch (memberError) {
        console.error(`[GARD018] Error processing member ${member.email}:`, memberError)
        failed.push({
          member: `${member.first_name} ${member.last_name}`,
          email: member.email,
          reason: memberError instanceof Error ? memberError.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked memberships. Found ${expiringMembers.length} expiring today.`,
      notificationsSent: notifications.length,
      notifications,
      failed: failed.length > 0 ? failed : undefined,
    })
  } catch (error) {
    console.error("[GARD018] Critical error checking memberships:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check memberships",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function sendExpiryEmails(member: any): Promise<boolean> {
  try {
    // Send to member
    const memberEmailResult = await resend.emails.send({
      from: "GARD 018 <info@gard018.com>",
      to: member.email,
      replyTo: "info@gard018.com",
      subject: "Obaveštenje - Istekla članarina - GARD 018",
      html: getMemberEmailHTML(member),
    })

    if (memberEmailResult.error) {
      console.error("[GARD018] Failed to send email to member:", memberEmailResult.error)
      return false
    }

    // Send notification to founder
    const founderEmailResult = await resend.emails.send({
      from: "GARD 018 <info@gard018.com>",
      to: "ognjen.boks19@gmail.com",
      replyTo: "info@gard018.com",
      subject: `Članarina istekla - ${member.first_name} ${member.last_name}`,
      html: getFounderEmailHTML(member),
    })

    if (founderEmailResult.error) {
      console.error("[GARD018] Failed to send email to founder:", founderEmailResult.error)
      // Still return true because member email was sent successfully
    }

    console.log("[GARD018] Emails sent successfully to member and founder")
    return true
  } catch (error) {
    console.error("[GARD018] Unexpected error in sendExpiryEmails:", error)
    return false
  }
}

function getMemberEmailHTML(member: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
          table { border-collapse: collapse; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #8f1528 0%, #1a0000 100%); padding: 40px 30px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 32px; font-weight: bold; }
          .header p { color: #e0e0e0; margin: 10px 0 0 0; font-size: 14px; }
          .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
          .content h2 { color: #8f1528; margin-top: 0; }
          .info-box { background-color: #f9f9f9; border-left: 4px solid #8f1528; padding: 20px; margin: 20px 0; }
          .contact-list { list-style: none; padding: 0; }
          .contact-list li { padding: 8px 0; }
          .button { display: inline-block; background-color: #8f1528; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { background-color: #1a1a1a; color: #999999; padding: 30px; text-align: center; font-size: 12px; }
          .footer p { margin: 5px 0; }
        </style>
      </head>
      <body>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table class="container" width="600" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="header">
                    <h1>GARD 018</h1>
                    <p>Borilački Klub</p>
                  </td>
                </tr>
                <tr>
                  <td class="content">
                    <h2>Poštovani ${member.first_name} ${member.last_name},</h2>
                    <p>Obaveštavamo vas da je vaša članarina u klubu GARD 018 istekla danas <strong>${new Date(member.expiry_date).toLocaleDateString("sr-RS")}</strong>.</p>
                    
                    <div class="info-box">
                      <strong>Da biste nastavili sa treninzima, molimo vas da obnovite članarinu.</strong>
                    </div>

                    <p>Za obnovu članarine i dodatne informacije, slobodno nas kontaktirajte:</p>
                    <ul class="contact-list">
                      <li><strong>Telefon:</strong> +381 62 202 420</li>
                      <li><strong>Email:</strong> info@gard018.com</li>
                      <li><strong>Adresa:</strong> Niš, Srbija</li>
                    </ul>

                    <a href="mailto:info@gard018.com" class="button">Kontaktirajte nas</a>

                    <p style="margin-top: 30px; color: #666; font-size: 14px;">
                      Radujemo se vašem povratku u klub!
                    </p>
                  </td>
                </tr>
                <tr>
                  <td class="footer">
                    <p><strong>GARD 018 Borilački Klub</strong></p>
                    <p>Niš, Srbija | +381 62 202 420</p>
                    <p style="margin-top: 15px;">
                      Ova poruka je poslata automatski jer je vaša članarina istekla.<br>
                      Ako imate pitanja, kontaktirajte nas na info@gard018.com
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

function getFounderEmailHTML(member: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
          table { border-collapse: collapse; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #8f1528 0%, #1a0000 100%); padding: 30px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; }
          .content { padding: 30px; color: #333333; line-height: 1.6; }
          .content h2 { color: #8f1528; margin-top: 0; }
          .member-info { background-color: #f9f9f9; border-left: 4px solid #8f1528; padding: 20px; margin: 20px 0; }
          .member-info p { margin: 8px 0; }
          .footer { background-color: #1a1a1a; color: #999999; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table class="container" width="600" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="header">
                    <h1>🔔 Notifikacija članarine</h1>
                  </td>
                </tr>
                <tr>
                  <td class="content">
                    <h2>Istekla članarina</h2>
                    <p>Korisniku je danas istekla članarina i poslat je automatski email.</p>
                    
                    <div class="member-info">
                      <p><strong>Ime:</strong> ${member.first_name} ${member.last_name}</p>
                      <p><strong>Email:</strong> ${member.email}</p>
                      <p><strong>Datum isteka:</strong> ${new Date(member.expiry_date).toLocaleDateString("sr-RS")}</p>
                    </div>

                    <p>Status člana je automatski promenjen u "expired" u bazi podataka.</p>
                  </td>
                </tr>
                <tr>
                  <td class="footer">
                    <p>GARD 018 - Automatska notifikacija</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}
