import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const messages = await sql`SELECT * FROM messages ORDER BY created_at DESC`
    return Response.json({ messages })
  } catch (error) {
    console.error("Error fetching messages:", error)
    return Response.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, phone, message } = await request.json()

    if (!name || !email || !message) {
      return Response.json({ error: "Name, email, and message are required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO messages (name, email, phone, message)
      VALUES (${name}, ${email}, ${phone || null}, ${message})
      RETURNING *
    `

    return Response.json({ message: result[0] })
  } catch (error) {
    console.error("Error sending message:", error)
    return Response.json({ error: "Failed to send message" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json()

    if (!id || !status) {
      return Response.json({ error: "ID and status are required" }, { status: 400 })
    }

    await sql`UPDATE messages SET status = ${status} WHERE id = ${id}`

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error updating message:", error)
    return Response.json({ error: "Failed to update message" }, { status: 500 })
  }
}
