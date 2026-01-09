import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  console.log("[v0] Session API called")

  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    console.log("[v0] Session cookie exists:", !!sessionCookie)

    if (!sessionCookie) {
      console.log("[v0] No session cookie found, returning null user")
      return NextResponse.json(
        { user: null },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }

    let session
    try {
      session = JSON.parse(sessionCookie.value)
      console.log("[v0] Session parsed successfully")
    } catch (parseError) {
      console.error("[v0] Session parse error:", parseError)
      const response = NextResponse.json(
        { user: null },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
      response.cookies.delete("session")
      return response
    }

    // Return user in consistent format
    return NextResponse.json(
      {
        user: session.user || session,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("[v0] Session error:", error)
    return NextResponse.json(
      { user: null },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
