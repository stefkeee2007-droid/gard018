import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import nodemailer from "nodemailer";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  const { data: members, error } = await supabase
    .from("members")
    .select("*")
    .eq("datum_isteka", today)
    .eq("is_active_member", true);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  for (const member of members ?? []) {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: member.email,
      subject: "Istek članarine",
      text: `Zdravo ${member.ime}, danas ti ističe članarina.`,
    });
  }

  return NextResponse.json({ sent: members?.length ?? 0 });
}
