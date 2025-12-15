import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)
    const { name, image } = await request.json()

    // Update session cookie with new data
    const updatedSession = {
      ...session,
      name: name || session.name,
      image: image || session.image,
    }

    cookieStore.set("session", JSON.stringify(updatedSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
