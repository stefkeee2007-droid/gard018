import { put } from "@vercel/blob"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const data = await request.formData()
    const file = data.get("file") as File

    if (!file) {
      return Response.json({ error: "Nema fajla" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie) {
      return Response.json({ error: "Niste ulogovani" }, { status: 401 })
    }

    // Session cookie format: "email|name|avatar"
    const sessionData = sessionCookie.value.split("|")
    const email = sessionData[0]

    if (!email) {
      return Response.json({ error: "Niste ulogovani" }, { status: 401 })
    }

    const sanitizedEmail = email.replace(/[^a-z0-9]/gi, "-")
    const extension = file.name.split(".").pop() || "jpg"
    const filename = `avatars/${sanitizedEmail}-${Date.now()}.${extension}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: file.type,
    })

    return Response.json({ url: blob.url })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return Response.json({ error: "Greška pri upload-ovanju" }, { status: 500 })
  }
}
