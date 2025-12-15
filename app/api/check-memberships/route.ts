import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    // Find members whose membership expired today or in the past and haven't been notified
    const expiredMembers = await sql`
      SELECT id, first_name, last_name, email, expiry_date
      FROM members
      WHERE expiry_date <= CURRENT_DATE
      AND status = 'active'
    `

    const notifications = []

    for (const member of expiredMembers) {
      // Send email notification
      const emailSent = await sendExpiryEmail(member)

      if (emailSent) {
        // Update member status to 'expired' after notification
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
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked memberships. Found ${expiredMembers.length} expired.`,
      notifications,
    })
  } catch (error) {
    console.error("[v0] Error checking memberships:", error)
    return NextResponse.json({ success: false, error: "Failed to check memberships" }, { status: 500 })
  }
}

async function sendExpiryEmail(member: any) {
  try {
    // For now, we'll log the email. You can integrate with Resend or SendGrid later
    const emailContent = {
      to: member.email,
      subject: "Обавештење - Истекла чланарина у клубу Gard 018",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #8f1528 0%, #1a0000 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #8f1528; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Gard 018</h1>
                <p>Боксарски и Кик Боксарски Клуб</p>
              </div>
              <div class="content">
                <h2>Поштовани ${member.first_name} ${member.last_name},</h2>
                <p>Обавештавамо вас да је ваша чланарина у клубу Gard 018 истекла <strong>${new Date(member.expiry_date).toLocaleDateString("sr-RS")}</strong>.</p>
                <p>Да бисте наставили са тренинзима, молимо вас да обновите чланарину.</p>
                <p>За обнову чланарине и додатне информације, контактирајте нас:</p>
                <ul>
                  <li>Телефон: +381 60 123 4567</li>
                  <li>Email: info@gard018.rs</li>
                  <li>Адреса: Niš, Србија</li>
                </ul>
                <a href="mailto:info@gard018.rs" class="button">Контактирајте нас</a>
              </div>
              <div class="footer">
                <p>© 2025 Gard 018 - Боксарски и Кик Боксарски Клуб</p>
                <p>Niš, Србија</p>
              </div>
            </div>
          </body>
        </html>
      `,
    }

    // Log email for testing (later integrate with Resend/SendGrid)
    console.log("[v0] Email would be sent:", emailContent)

    // TODO: Integrate with email service
    // const response = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     from: 'Gard 018 <noreply@gard018.rs>',
    //     ...emailContent
    //   })
    // })

    return true
  } catch (error) {
    console.error("[v0] Error sending email:", error)
    return false
  }
}
