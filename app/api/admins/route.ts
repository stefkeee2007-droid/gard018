import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const admins = await sql`SELECT * FROM admins ORDER BY created_at DESC`
    return Response.json({ admins })
  } catch (error) {
    console.error("Error fetching admins:", error)
    return Response.json({ error: "Failed to fetch admins" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { email, grantedBy } = await request.json()

    if (!email || !grantedBy) {
      return Response.json({ error: "Email and grantedBy are required" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO admins (email, granted_by)
      VALUES (${email}, ${grantedBy})
      ON CONFLICT (email) DO NOTHING
      RETURNING *
    `

    if (result.length === 0) {
      return Response.json({ error: "Admin already exists" }, { status: 409 })
    }

    return Response.json({ admin: result[0] })
  } catch (error) {
    console.error("Error adding admin:", error)
    return Response.json({ error: "Failed to add admin" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 })
    }

    if (email === "stefkeee2007@gmail.com") {
      return Response.json({ error: "Cannot remove primary admin" }, { status: 403 })
    }

    await sql`DELETE FROM admins WHERE email = ${email}`

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error removing admin:", error)
    return Response.json({ error: "Failed to remove admin" }, { status: 500 })
  }
}
