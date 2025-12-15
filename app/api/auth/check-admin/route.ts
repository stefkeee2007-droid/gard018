import { neon } from "@neondatabase/serverless"
import { cookies } from "next/headers"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie) {
      return Response.json({ isAdmin: false })
    }

    const session = JSON.parse(sessionCookie.value)
    const userEmail = session.user?.email

    if (!userEmail) {
      return Response.json({ isAdmin: false })
    }

    const result = await sql`SELECT * FROM admins WHERE email = ${userEmail}`

    return Response.json({ isAdmin: result.length > 0 })
  } catch (error) {
    console.error("Error checking admin status:", error)
    return Response.json({ isAdmin: false })
  }
}
