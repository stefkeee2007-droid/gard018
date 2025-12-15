import { NextResponse } from "next/server";
import { sendTestEmail } from "@/app/admin/actions";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");

  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // test – kasnije ovde ide prava logika za istek članarine
  await sendTestEmail();

  return NextResponse.json({ sent: true });
}
