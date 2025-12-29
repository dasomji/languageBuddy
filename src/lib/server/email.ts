import { Resend } from "resend";
import { env } from "~/env";

export const resend = new Resend(env.RESEND_API_KEY);

interface SendInvitationEmailOptions {
  email: string;
  inviterName?: string;
}

/**
 * Sends a beta invitation email to a new user
 */
export async function sendInvitationEmail({
  email,
  inviterName = "The EdgeLang Team",
}: SendInvitationEmailOptions) {
  const signupUrl = `${env.BETTER_AUTH_URL}/auth/signup`;

  const { data, error } = await resend.emails.send({
    from: "EdgeLang <onboarding@resend.dev>",
    to: email,
    subject: "You're invited to EdgeLang Beta! 🎉",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to EdgeLang! 🚀</h1>
  </div>
  
  <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <p style="font-size: 16px; color: #374151;">Hi there!</p>
    
    <p style="font-size: 16px; color: #374151;">
      ${inviterName} has invited you to join <strong>EdgeLang</strong> – an AI-powered language learning platform that creates personalized content from your daily experiences.
    </p>
    
    <p style="font-size: 16px; color: #374151;">
      As an early beta user, you'll get access to:
    </p>
    
    <ul style="color: #374151; font-size: 16px;">
      <li>📖 AI-generated mini-stories based on your diary entries</li>
      <li>🎯 Personalized vocabulary packages</li>
      <li>🎧 Native audio for every word and story</li>
      <li>🖼️ Mnemonic images to help you remember</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Create Your Account
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      If you have any questions, just reply to this email – we'd love to hear from you!
    </p>
    
    <p style="font-size: 14px; color: #6b7280;">
      Happy learning! 🌟<br>
      The EdgeLang Team
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>You received this email because someone invited you to EdgeLang.</p>
  </div>
</body>
</html>
    `.trim(),
    text: `
You're invited to EdgeLang Beta!

${inviterName} has invited you to join EdgeLang – an AI-powered language learning platform that creates personalized content from your daily experiences.

As an early beta user, you'll get access to:
- AI-generated mini-stories based on your diary entries
- Personalized vocabulary packages
- Native audio for every word and story
- Mnemonic images to help you remember

Create your account here: ${signupUrl}

Happy learning!
The EdgeLang Team
    `.trim(),
  });

  if (error) {
    throw new Error(`Failed to send invitation email: ${error.message}`);
  }

  return data;
}

interface SendApprovalEmailOptions {
  email: string;
  name: string;
}

/**
 * Sends an email notifying the user their account has been approved
 */
export async function sendApprovalEmail({
  email,
  name,
}: SendApprovalEmailOptions) {
  const dashboardUrl = env.BETTER_AUTH_URL;

  const { data, error } = await resend.emails.send({
    from: "EdgeLang <onboarding@resend.dev>",
    to: email,
    subject: "Your EdgeLang account has been approved! 🎉",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">You're In! 🎊</h1>
  </div>
  
  <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <p style="font-size: 16px; color: #374151;">Hi ${name}!</p>
    
    <p style="font-size: 16px; color: #374151;">
      Great news – your EdgeLang account has been approved! You now have full access to all features.
    </p>
    
    <p style="font-size: 16px; color: #374151;">
      Here's what you can do now:
    </p>
    
    <ul style="color: #374151; font-size: 16px;">
      <li>📝 Write your first diary entry</li>
      <li>📖 Read AI-generated stories</li>
      <li>📚 Build your vocabulary with VoDex</li>
      <li>💪 Practice in the Gym</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Start Learning
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Welcome to the EdgeLang community! 🌟
    </p>
    
    <p style="font-size: 14px; color: #6b7280;">
      The EdgeLang Team
    </p>
  </div>
</body>
</html>
    `.trim(),
    text: `
Hi ${name}!

Great news – your EdgeLang account has been approved! You now have full access to all features.

Here's what you can do now:
- Write your first diary entry
- Read AI-generated stories
- Build your vocabulary with VoDex
- Practice in the Gym

Start learning: ${dashboardUrl}

Welcome to the EdgeLang community!
The EdgeLang Team
    `.trim(),
  });

  if (error) {
    throw new Error(`Failed to send approval email: ${error.message}`);
  }

  return data;
}
