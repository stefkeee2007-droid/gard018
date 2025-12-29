import { NextResponse } from "next/server";
import { Resend } from "resend";
// Ovde verovatno imas i import za db/sql, ostavi ga kako jeste
// import { sql } from "@vercel/postgres"; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    // 1. PROVERA: Da li ključ postoji?
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.error("❌ GREŠKA: RESEND_API_KEY nije pronađen u environment varijablama!");
      return NextResponse.json(
        { error: "Server misconfiguration: Missing API Key" },
        { status: 500 }
      );
    }

    // 2. INICIJALIZACIJA: Radimo je OVDE, unutar funkcije, ne na vrhu fajla!
    const resend = new Resend(apiKey);

    // Ovde ide tvoja logika za proveru korisnika u bazi...
    // const result = await sql`SELECT * FROM users WHERE email=${email}`;
    // if (result.rows.length === 0) ...

    // 3. SLANJE EMAILA
    console.log(`📧 Pokušavam slanje na: ${email} sa ključem koji počinje na: ${apiKey.substring(0, 5)}...`);
    
    const data = await resend.emails.send({
      from: "Podrška <onboarding@resend.dev>", // ILI TVOJ VERIFIKOVAN DOMEN
      to: email,
      subject: "Resetovanje lozinke",
      html: `<p>Zatražili ste resetovanje lozinke.</p>`, // Ovde ide tvoj HTML
    });

    if (data.error) {
      console.error("❌ Resend API vratio grešku:", data.error);
      return NextResponse.json({ error: data.error.message }, { status: 401 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("❌ Neočekivana greška:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
