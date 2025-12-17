import { put } from "@vercel/blob"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    console.log("[v0] Upload started")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      console.log("[v0] No file in form data")
      return Response.json({ error: "Nema fajla" }, { status: 400 })
    }

    console.log("[v0] File received:", file.name, file.type, file.size)

    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie) {
      console.log("[v0] No session cookie")
      return Response.json({ error: "Niste ulogovani" }, { status: 401 })
    }

    const sessionData = sessionCookie.value.split("|")
    const email = sessionData[0]

    if (!email) {
      console.log("[v0] No email in session")
      return Response.json({ error: "Niste ulogovani" }, { status: 401 })
    }

    const sanitizedEmail = email.replace(/[^a-z0-9]/gi, "-")
    const extension = file.name.split(".").pop() || "jpg"
    const filename = `avatars/${sanitizedEmail}-${Date.now()}.${extension}`

    console.log("[v0] Uploading to blob:", filename)

    const blob = await put(filename, file, {
      access: "public",
    })

    console.log("[v0] Upload successful:", blob.url)

    return Response.json({ url: blob.url })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return Response.json(
      { error: `Greška pri upload-ovanju: ${error instanceof Error ? error.message : "nepoznata greška"}` },
      { status: 500 },
    )
  }
}
