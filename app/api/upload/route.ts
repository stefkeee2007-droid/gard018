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
    const email = sessionCookie?.value.split("|")[0]

    if (!email) {
      return Response.json({ error: "Niste ulogovani" }, { status: 401 })
    }

    const filename = `${email}-${Date.now()}-${file.name}`
    const blob = await put(filename, file, { access: "public" })

    return Response.json({ url: blob.url })
  } catch (error) {
    console.error("Upload error:", error)
    return Response.json({ error: "Greška pri upload-ovanju" }, { status: 500 })
  }
}
