import { put } from "@vercel/blob"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: Request) {
  try {
    console.log("[v0] Upload started")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      console.log("[v0] No file in form data")
      return NextResponse.json({ error: "Nema fajla" }, { status: 400 })
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      console.log("[v0] Invalid file type:", file.type)
      return NextResponse.json(
        { error: "Tip fajla nije dozvoljen. Dozvoljeni su samo slike (JPG, PNG, WebP, GIF)" },
        { status: 400 },
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      console.log("[v0] File too large:", file.size)
      return NextResponse.json({ error: "Fajl je prevelik. Maksimalna veličina je 5MB" }, { status: 400 })
    }

    console.log("[v0] File received:", file.name, file.type, file.size)

    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie) {
      console.log("[v0] No session cookie")
      return NextResponse.json({ error: "Niste ulogovani" }, { status: 401 })
    }

    let email: string
    try {
      const session = JSON.parse(sessionCookie.value)
      email = session.user?.email

      if (!email) {
        console.log("[v0] No email in session")
        return NextResponse.json({ error: "Niste ulogovani" }, { status: 401 })
      }
    } catch (parseError) {
      console.error("[v0] Session parse error:", parseError)
      return NextResponse.json({ error: "Nevažeća sesija" }, { status: 401 })
    }

    const sanitizedEmail = email.replace(/[^a-z0-9]/gi, "-")
    const extension = file.name.split(".").pop() || "jpg"
    const filename = `avatars/${sanitizedEmail}-${Date.now()}.${extension}`

    console.log("[v0] Uploading to blob:", filename)

    const blob = await put(filename, file, {
      access: "public",
    })

    console.log("[v0] Upload successful:", blob.url)

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json(
      { error: `Greška pri upload-ovanju: ${error instanceof Error ? error.message : "nepoznata greška"}` },
      { status: 500 },
    )
  }
}
