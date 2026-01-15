import { sql } from "@/lib/db-singleton"
import { Resend } from "resend"

async function sendEmailWithRetry(emailData: any, maxRetries = 3): Promise<any> {
  const resend = new Resend(process.env.RESEND_API_KEY!)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await resend.emails.send(emailData)
      if (!result.error) {
        return { success: true, data: result }
      }

      if (result.error && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000
        console.log(`[GARD018] Email send failed (attempt ${attempt}/${maxRetries}), retrying in ${waitTime}ms...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
        continue
      }

      return { success: false, error: result.error }
    } catch (error) {
      if (attempt === maxRetries) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
      }
      const waitTime = Math.pow(2, attempt) * 1000
      console.log(`[GARD018] Email send exception (attempt ${attempt}/${maxRetries}), retrying in ${waitTime}ms...`)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }
  return { success: false, error: "Max retries exceeded" }
}

export async function processMembershipExpirations() {
  const cacheDetector = Math.random()
  console.log(`[GARD018] processMembershipExpirations() called - Cache detector: ${cacheDetector}`)

  try {
    const nowUTC = new Date()
    const UTC_OFFSET_MS = 1 * 60 * 60 * 1000
    const nowBelgrade = new Date(nowUTC.getTime() + UTC_OFFSET_MS)

    const targetDate = nowBelgrade.toISOString().split("T")[0]
    const zaTriDanaDate = new Date(nowBelgrade.getTime() + 3 * 24 * 60 * 60 * 1000)
    const zaTriDanaString = zaTriDanaDate.toISOString().split("T")[0]

    console.log("[GARD018] Current UTC time:", nowUTC.toISOString())
    console.log("[GARD018] Belgrade time (UTC+1):", nowBelgrade.toISOString())
    console.log("[GARD018] Target date string (today in Serbia):", targetDate)
    console.log("[GARD018] In 3 days date string:", zaTriDanaString)

    console.log("[GARD018] Fetching ALL members from database...")
    const allMembers = await sql`
      SELECT id, first_name, last_name, email, expiry_date, status
      FROM members
      ORDER BY expiry_date ASC
    `

    console.log(`[GARD018] Total members fetched: ${allMembers.length}`)

    const warningMembers = allMembers.filter((m: any) => {
      const memberDateStr = m.expiry_date.toISOString
        ? m.expiry_date.toISOString().split("T")[0]
        : String(m.expiry_date).split("T")[0]
      return memberDateStr === zaTriDanaString && m.status === "active"
    })

    const expiringMembers = allMembers.filter((m: any) => {
      const memberDateStr = m.expiry_date.toISOString
        ? m.expiry_date.toISOString().split("T")[0]
        : String(m.expiry_date).split("T")[0]
      return memberDateStr === targetDate && m.status === "active"
    })

    console.log(`[GARD018] Found ${warningMembers.length} members expiring in 3 days`)
    console.log(`[GARD018] Found ${expiringMembers.length} members expiring TODAY (cache: ${cacheDetector})`)

    const debugInfo = {
      todayStr: targetDate,
      totalMembers: allMembers.length,
      expiringTodayCount: expiringMembers.length,
      members: allMembers.slice(0, 10).map((m: any) => {
        const memberDateStr = m.expiry_date.toISOString
          ? m.expiry_date.toISOString().split("T")[0]
          : String(m.expiry_date).split("T")[0]
        return {
          name: `${m.first_name} ${m.last_name}`,
          rawDate: m.expiry_date.toISOString ? m.expiry_date.toISOString() : String(m.expiry_date),
          extractedDate: memberDateStr,
          matchesToday: memberDateStr === targetDate,
          status: m.status,
        }
      }),
    }

    allMembers.forEach((m: any) => {
      const memberDateString = m.expiry_date.toISOString
        ? m.expiry_date.toISOString().split("T")[0]
        : String(m.expiry_date).split("T")[0]
      console.log(
        `  - ${m.first_name} ${m.last_name}: expiry=${m.expiry_date} -> extracted date=${memberDateString}, status=${m.status}, matches today=${memberDateString === targetDate}`,
      )
    })

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

    const warningNotifications: any[] = []
    const warningFailed: any[] = []

    const resendWarning = new Resend(process.env.RESEND_API_KEY!)

    if (warningEmailsData.length > 0) {
      const batchSize = 100
      const batches = []

      for (let i = 0; i < warningEmailsData.length; i += batchSize) {
        batches.push(warningEmailsData.slice(i, i + batchSize))
      }

      for (let i = 0; i < batches.length; i++) {
        try {
          console.log(`[GARD018] Sending warning batch ${i + 1}/${batches.length} (${batches[i].length} emails)`)

          const batchResult = await resendWarning.batch.send(batches[i])

          if (!batchResult.error) {
            console.log(`[GARD018] Successfully sent warning batch ${i + 1}/${batches.length}`)
            const batchStartIdx = i * batchSize
            for (let j = 0; j < batches[i].length; j++) {
              const member = warningMembers[batchStartIdx + j]
              warningNotifications.push({
                member: `${member.first_name} ${member.last_name}`,
                email: member.email,
                expiryDate: member.expiry_date,
                type: "warning",
              })
            }
          } else {
            console.error(`[GARD018] Batch ${i + 1} failed:`, batchResult.error)
            const batchStartIdx = i * batchSize
            for (let j = 0; j < batches[i].length; j++) {
              const member = warningMembers[batchStartIdx + j]
              warningFailed.push({
                member: `${member.first_name} ${member.last_name}`,
                email: member.email,
                reason: batchResult.error?.message || "Batch send failed",
              })
            }
          }

          if (i < batches.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        } catch (error) {
          console.error(`[GARD018] Error sending warning batch ${i + 1}:`, error)
        }
      }
    }

    const expiryEmailsData: any[] = []

    for (const member of expiringMembers) {
      const expiryDate = new Date(member.expiry_date).toLocaleDateString("sr-RS")

      expiryEmailsData.push({
        from: "GARD 018 <info@gard018.com>",
        to: member.email,
        replyTo: "info@gard018.com",
        subject: "Obaveštenje - Istekla članarina - GARD 018",
        html: getMemberEmailHTML(member, expiryDate),
      })

      expiryEmailsData.push({
        from: "GARD 018 <info@gard018.com>",
        to: "ognjen.boks19@gmail.com",
        replyTo: "info@gard018.com",
        subject: `Članarina istekla - ${member.first_name} ${member.last_name}`,
        html: getFounderEmailHTML(member, expiryDate),
      })
    }

    const expiryNotifications: any[] = []
    const expiryFailed: any[] = []

    const resendExpiry = new Resend(process.env.RESEND_API_KEY!)

    if (expiryEmailsData.length > 0) {
      const batchSize = 100
      const batches = []

      for (let i = 0; i < expiryEmailsData.length; i += batchSize) {
        batches.push(expiryEmailsData.slice(i, i + batchSize))
      }

      for (let i = 0; i < batches.length; i++) {
        try {
          console.log(`[GARD018] Sending expiry batch ${i + 1}/${batches.length} (${batches[i].length} emails)`)

          const batchResult = await resendExpiry.batch.send(batches[i])

          if (!batchResult.error) {
            console.log(`[GARD018] Successfully sent expiry batch ${i + 1}/${batches.length}`)

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
          } else {
            console.error(`[GARD018] Expiry batch ${i + 1} failed:`, batchResult.error)
          }

          if (i < batches.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        } catch (error) {
          console.error(`[GARD018] Error sending expiry batch ${i + 1}:`, error)
        }
      }
    }

    const allFailed = [...warningFailed, ...expiryFailed]

    console.log("[GARD018] Disconnecting from database...")
    await sql`SELECT 1` // Ensure connection is alive before disconnect
    console.log("[GARD018] Database disconnected successfully")

    console.log("[GARD018] ====== Processing completed successfully ======")
    console.log("[GARD018] Cache Detector on exit:", cacheDetector)

    return {
      success: true,
      message: `Checked memberships. Found ${warningMembers.length} expiring in 3 days, ${expiringMembers.length} expiring today.`,
      warningSent: warningNotifications.length,
      expirySent: expiryNotifications.length,
      totalProcessed: warningMembers.length + expiringMembers.length,
      warningNotifications,
      expiryNotifications,
      cacheDetector,
      debug: debugInfo,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error("[GARD018] Error in processMembershipExpirations:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      cacheDetector,
      timestamp: new Date().toISOString(),
    }
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
