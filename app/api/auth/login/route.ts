import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name, image } = body

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Lozinka mora imati najmanje 6 karaktera" }, { status: 400 })
    }

    // For now, just check if password is not empty
    if (!password) {
      return NextResponse.json({ error: "Pogrešna lozinka. Pokušajte ponovo." }, { status: 401 })
    }

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
    return NextResponse.json({ error: "Greška pri prijavi" }, { status: 500 })
  }
}
