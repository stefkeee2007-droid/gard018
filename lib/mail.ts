import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendTestEmail(to: string) {
  await transporter.sendMail({
    from: `"Boxing Gym" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Test mejl – Boxing Gym",
    text: "Ovo je test mejl. Ako si ga dobio, sistem radi.",
  });
}
