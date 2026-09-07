import nodemailer from "nodemailer";
import { resolveDepartment } from "@/lib/submissions";
import {
  requireAdmin,
  validateEmailPayload,
  createSafeErrorResponse,
} from "@/lib/security";
import { rateLimitGuard } from "@/lib/rate-limit";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

export async function POST(req) {
  try {
    const reqHeaders = await headers();

    // 1. Enforce admin authentication & authorization
    const { user, response: authError } = await requireAdmin(reqHeaders);
    if (authError) {
      return authError;
    }

    // 2. Enforce strict rate limiting on email dispatch
    const rateLimitResponse = rateLimitGuard(req, {
      prefix: "admin:send-email",
      limit: 10,
      windowMs: 60000,
      identifier: user.email,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 3. Parse and validate email payload
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "Invalid JSON payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { valid, errors, sanitizedData } = validateEmailPayload(rawBody);
    if (!valid) {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: errors.join(", ") }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { recipients, payloadData } = sanitizedData;
    const transporter = getTransporter();

    for (const recipient of recipients) {
      const rawDept = recipient.Department;
      const resolved = resolveDepartment(rawDept);
      let deptName = resolved?.name || rawDept || "Department";

      if (deptName === "Video Editing") {
        deptName = "Photography";
      }
      if (
        deptName === "Web Development" ||
        deptName === "App Development"
      ) {
        deptName = "Development Department";
      }
      if (deptName === "Photography" || deptName === "Video Editing") {
        deptName = "Photography & Video Editing Department";
      }

      let emailHtml = `<div>${payloadData.body}</div>`;
      emailHtml = emailHtml.replace(/#name/g, recipient.Name || "Applicant");
      emailHtml = emailHtml.replace(/#dept/g, deptName);

      const mailOptions = {
        from: process.env.EMAIL_USERNAME,
        to: recipient.Email,
        subject: payloadData.subject,
        html: emailHtml,
      };

      await transporter.sendMail(mailOptions);
    }

    return new Response(
      JSON.stringify({ message: "Emails sent successfully", count: recipients.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return createSafeErrorResponse(error, "Failed to send emails", 500);
  }
}
