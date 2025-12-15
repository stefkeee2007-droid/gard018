"use server";

import nodemailer from "nodemailer";

export async function sendTestEmail() {
  console.log("TEST EMAIL ACTION STARTED");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_USER,
    subject: "Test email – Boxing Gym",
    text: "Ako vidiš ovaj mejl, sistem radi 💪",
  });

  console.log("EMAIL SENT");
}
