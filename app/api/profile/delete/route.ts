import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)
    const userEmail = session.email

    // Delete from members table (email automation)
    await sql`DELETE FROM members WHERE email = ${userEmail}`

    // Delete from admins table if exists
    await sql`DELETE FROM admins WHERE email = ${userEmail}`

    // Clear session cookie
    cookieStore.delete("session")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting account:", error)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
