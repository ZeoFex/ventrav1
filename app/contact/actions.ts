"use server";

import { z } from "zod";
import { sendContactEmail } from "@/server/auth/email-service";

const contactSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(3, "Subject must be at least 3 characters").max(150),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
});

export async function submitContactForm(formData: z.infer<typeof contactSchema>) {
  try {
    // 1. Validate on server
    const parsed = contactSchema.safeParse(formData);
    
    if (!parsed.success) {
      return { 
        success: false, 
        error: "Validation failed", 
        details: parsed.error.flatten().fieldErrors 
      };
    }

    const { fullName, email, subject, message } = parsed.data;

    // 2. Send email
    const result = await sendContactEmail({
      senderName: fullName,
      senderEmail: email,
      subject,
      message,
    });

    if (!result.success) {
      return { success: false, error: "Failed to send message. Please try again later." };
    }

    return { 
      success: true, 
      message: "Your message has been sent successfully. We'll get back to you soon!" 
    };
  } catch (error) {
    console.error("[Contact Action Error]:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
