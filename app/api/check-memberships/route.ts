import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"
import { Resend } from "resend"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    console.log("[GARD018] Starting membership check...")

    const today = new Date()
    const cetOffset = 60 // CET is UTC+1 (60 minutes)
    const cetNow = new Date(today.getTime() + cetOffset * 60 * 1000)

    // Start of today (00:00:00)
    const startOfToday = new Date(cetNow.getFullYear(), cetNow.getMonth(), cetNow.getDate(), 0, 0, 0)
    // End of today (23:59:59)
    const endOfToday = new Date(cetNow.getFullYear(), cetNow.getMonth(), cetNow.getDate(), 23, 59, 59)

    // Start of target day (3 days from now at 00:00:00)
    const targetDay = new Date(cetNow.getFullYear(), cetNow.getMonth(), cetNow.getDate() + 3, 0, 0, 0)
    // End of target day (3 days from now at 23:59:59)
    const endOfTargetDay = new Date(cetNow.getFullYear(), cetNow.getMonth(), cetNow.getDate() + 3, 23, 59, 59)

    console.log("[GARD018] Today range:", startOfToday.toISOString(), "to", endOfToday.toISOString())
    console.log("[GARD018] Target day range (3 days):", targetDay.toISOString(), "to", endOfTargetDay.toISOString())

    const warningMembers = await sql`
      SELECT id, first_name, last_name, email, expiry_date
      FROM members
      WHERE expiry_date::date = (CURRENT_DATE AT TIME ZONE 'Europe/Belgrade')::date + INTERVAL '3 days'
      AND status = 'active'
    `

    console.log("[GARD018] Found members expiring in 3 days:", warningMembers.length)

    const expiringMembers = await sql`
      SELECT id, first_name, last_name, email, expiry_date
      FROM members
      WHERE expiry_date::date = (CURRENT_DATE AT TIME ZONE 'Europe/Belgrade')::date
      AND status = 'active'
    `

    console.log("[GARD018] Found members expiring today:", expiringMembers.length)

    const warningEmailsData = warningMembers.map((member: any) => {
      const expiryDate = new Date(member.expiry_date).toLocaleDateString("sr-RS")
      return {
        from: "GARD 018 <info@gard018.com>",
        to: member.email,
        replyTo: "info@gard018.com",
        subject: "Obaveštenje - Članarina ističe za 3 dana - GARD 018",
        html: getWarningEmailHTML(member, expiryDate),
      }
    })

    let warningNotifications: any[] = []
    let warningFailed: any[] = []

    if (warningEmailsData.length > 0) {
      try {
        // Send up to 100 emails in one batch request
        const batchResult = await resend.batch.send(warningEmailsData)

        if (batchResult.error) {
          console.error("[GARD018] Batch send warning emails failed:", batchResult.error)
          warningFailed = warningMembers.map((m: any) => ({
            member: `${m.first_name} ${m.last_name}`,
            email: m.email,
            reason: batchResult.error?.message || "Batch send failed",
          }))
        } else {
          console.log(`[GARD018] Successfully sent ${warningEmailsData.length} warning emails via Batch API`)
          warningNotifications = warningMembers.map((m: any) => ({
            member: `${m.first_name} ${m.last_name}`,
            email: m.email,
            expiryDate: m.expiry_date,
            type: "warning",
          }))
        }
      } catch (error) {
        console.error("[GARD018] Error sending batch warning emails:", error)
        warningFailed = warningMembers.map((m: any) => ({
          member: `${m.first_name} ${m.last_name}`,
          email: m.email,
          reason: error instanceof Error ? error.message : "Unknown error",
        }))
      }
    }

    const expiryEmailsData: any[] = []
    const memberIdMap: Map<string, any> = new Map()

    for (const member of expiringMembers) {
      const expiryDate = new Date(member.expiry_date).toLocaleDateString("sr-RS")
      const emailId = `member-${member.id}`
      memberIdMap.set(emailId, member)

      // Email to member
      expiryEmailsData.push({
        from: "GARD 018 <info@gard018.com>",
        to: member.email,
        replyTo: "info@gard018.com",
        subject: "Obaveštenje - Istekla članarina - GARD 018",
        html: getMemberEmailHTML(member, expiryDate),
      })

      // Email to founder
      expiryEmailsData.push({
        from: "GARD 018 <info@gard018.com>",
        to: "ognjen.boks19@gmail.com",
        replyTo: "info@gard018.com",
        subject: `Članarina istekla - ${member.first_name} ${member.last_name}`,
        html: getFounderEmailHTML(member, expiryDate),
      })
    }

    const expiryNotifications: any[] = []
    let expiryFailed: any[] = []

    if (expiryEmailsData.length > 0) {
      try {
        // Send up to 100 emails in one batch request (50 members = 100 emails)
        const batchResult = await resend.batch.send(expiryEmailsData)

        if (batchResult.error) {
          console.error("[GARD018] Batch send expiry emails failed:", batchResult.error)
          expiryFailed = expiringMembers.map((m: any) => ({
            member: `${m.first_name} ${m.last_name}`,
            email: m.email,
            reason: batchResult.error?.message || "Batch send failed",
          }))
        } else {
          console.log(`[GARD018] Successfully sent ${expiryEmailsData.length} expiry emails via Batch API`)

          // Update status for all expiring members
          for (const member of expiringMembers) {
            try {
              await sql`
                UPDATE members
                SET status = 'expired', updated_at = CURRENT_TIMESTAMP
                WHERE id = ${member.id}
              `

              expiryNotifications.push({
                member: `${member.first_name} ${member.last_name}`,
                email: member.email,
                expiryDate: member.expiry_date,
                type: "expiry",
              })
            } catch (updateError) {
              console.error(`[GARD018] Failed to update status for member ${member.id}:`, updateError)
            }
          }
        }
      } catch (error) {
        console.error("[GARD018] Error sending batch expiry emails:", error)
        expiryFailed = expiringMembers.map((m: any) => ({
          member: `${m.first_name} ${m.last_name}`,
          email: m.email,
          reason: error instanceof Error ? error.message : "Unknown error",
        }))
      }
    }

    const allFailed = [...warningFailed, ...expiryFailed]

    return NextResponse.json({
      success: true,
      message: `Checked memberships. Found ${warningMembers.length} expiring in 3 days, ${expiringMembers.length} expiring today.`,
      warningSent: warningNotifications.length,
      expirySent: expiryNotifications.length,
      warningNotifications,
      expiryNotifications,
      failed: allFailed.length > 0 ? allFailed : undefined,
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

function getWarningEmailHTML(member: any, expiryDate: string): string {
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
          .warning-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; }
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
                    <p>Želimo da vas podsetimo da vaša članarina u klubu GARD 018 ističe za <strong>3 dana</strong>.</p>
                    
                    <div class="warning-box">
                      <strong>⚠️ Datum isteka: ${expiryDate}</strong>
                    </div>

                    <p>Da biste nastavili sa treninzima bez prekida, molimo vas da obnovite članarinu na vreme.</p>

                    <div class="info-box">
                      <p><strong>Kako obnoviti članarinu?</strong></p>
                      <p>Kontaktirajte nas putem telefona ili email-a, a možete nas posetiti i lično u teretani.</p>
                    </div>

                    <p>Za obnovu članarine i dodatne informacije:</p>
                    <ul class="contact-list">
                      <li><strong>Telefon:</strong> +381 62 202 420</li>
                      <li><strong>Email:</strong> info@gard018.com</li>
                      <li><strong>Adresa:</strong> Niš, Srbija</li>
                    </ul>

                    <a href="mailto:info@gard018.com" class="button">Kontaktirajte nas</a>

                    <p style="margin-top: 30px; color: #666; font-size: 14px;">
                      Vidimo se na treningu!
                    </p>
                  </td>
                </tr>
                <tr>
                  <td class="footer">
                    <p><strong>GARD 018 Borilački Klub</strong></p>
                    <p>Niš, Srbija | +381 62 202 420</p>
                    <p style="margin-top: 15px;">
                      Ova poruka je poslata automatski jer vaša članarina ističe za 3 dana.<br>
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

function getMemberEmailHTML(member: any, expiryDate: string): string {
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
                    <p>Obaveštavamo vas da je vaša članarina u klubu GARD 018 istekla danas <strong>${expiryDate}</strong>.</p>
                    
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

function getFounderEmailHTML(member: any, expiryDate: string): string {
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
                      <p><strong>Datum isteka:</strong> ${expiryDate}</p>
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
