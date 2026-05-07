import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    logger: true, 
    debug: true, 
});

export async function sendOtpEmail(to: string, code: string) {
    await transporter.sendMail({
        from: `"Your App" <${process.env.SMTP_USER}>`,
        to,
        subject: "Your verification code",
        text: `Your OTP is: ${code}. It expires in 10 minutes.`,
    });
}