import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name, image } = body

    const session = {
      user: {
        email,
        name: name || email.split("@")[0],
        image:
          image || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email)}&background=8f1528&color=fff`,
      },
    }

    const cookieStore = await cookies()
    cookieStore.set("session", JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    })

    return NextResponse.json({ success: true, user: session.user })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Failed to login" }, { status: 500 })
  }
}
