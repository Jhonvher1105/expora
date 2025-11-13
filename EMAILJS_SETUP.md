# EmailJS Setup Guide for ExporaBnB

This guide will help you set up EmailJS for sending beautiful email verification emails with the ExporaBnB branding.

## 📋 Prerequisites

1. An EmailJS account (free tier available)
2. An email service (Gmail, Outlook, etc.)

## 🚀 Step-by-Step Setup

### Step 1: Create EmailJS Account

1. Go to [EmailJS](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email address

### Step 2: Add Email Service

1. In your EmailJS dashboard, go to **Email Services**
2. Click **Add New Service**
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the instructions to connect your email account
5. **Save your Service ID** (you'll need this later)

### Step 3: Create Email Template

1. Go to **Email Templates** in your EmailJS dashboard
2. Click **Create New Template**
3. Name it: "ExporaBnB Email Verification"
4. Copy the HTML content from `src/utils/emailVerificationTemplate.html`
5. Paste it into the template editor

#### Template Variables

Make sure your template includes these variables:
- `{{user_name}}` - User's name
- `{{user_email}}` - User's email address
- `{{verification_link}}` - The verification link

#### Template Settings

- **Subject**: `Verify Your Email - ExporaBnB`
- **From Name**: `ExporaBnB`
- **From Email**: Your connected email address
- **Reply To**: Your support email (optional)

4. **Save your Template ID** (you'll need this later)

### Step 4: Get Your Public Key

1. Go to **Account** → **General** in your EmailJS dashboard
2. Find your **Public Key** (also called API Key)
3. **Copy your Public Key** (you'll need this later)

### Step 5: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your EmailJS credentials:
   ```env
   VITE_EMAILJS_SERVICE_ID=service_xxxxxxxxx
   VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxxxx
   VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
   ```

3. **Important**: Never commit `.env` to version control! It's already in `.gitignore`

### Step 6: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to the registration page
3. Register a new account
4. Check your email inbox for the verification email

## 📧 Email Template Features

The EmailJS template includes:

- ✅ **Beautiful Design**: Modern, responsive email template
- ✅ **ExporaBnB Branding**: Orange gradient header matching your brand
- ✅ **Clear Call-to-Action**: Prominent verification button
- ✅ **Security Note**: Information about link expiration
- ✅ **Fallback Link**: Text link if button doesn't work
- ✅ **Professional Footer**: Contact information and branding

## 🔧 Troubleshooting

### Email Not Sending

1. **Check Environment Variables**: Make sure all three EmailJS variables are set in `.env`
2. **Verify Service Connection**: Check that your email service is properly connected in EmailJS
3. **Check Console**: Look for error messages in the browser console
4. **Test Template**: Use EmailJS's test feature to verify your template works

### Email Goes to Spam

1. **Verify Sender**: Make sure your "From" email is verified in EmailJS
2. **Check SPF/DKIM**: Ensure your email service has proper authentication
3. **Test with Different Providers**: Try sending to different email providers

### Template Variables Not Working

1. **Check Variable Names**: Ensure they match exactly: `{{user_name}}`, `{{user_email}}`, `{{verification_link}}`
2. **Verify in Code**: Check `src/utils/emailService.js` to see what parameters are being sent

## 📝 Code Structure

- **Email Service**: `src/utils/emailService.js` - Handles sending emails via EmailJS
- **Email Template**: `src/utils/emailVerificationTemplate.html` - HTML template for emails
- **Registration**: `src/login2/Registration.jsx` - Uses EmailJS to send verification emails
- **Verification Page**: `src/login2/VerifyEmail.jsx` - Handles email verification

## 🔐 Security Notes

1. **Public Key**: The EmailJS public key is safe to expose in frontend code
2. **Rate Limiting**: EmailJS free tier has rate limits (200 emails/month)
3. **Link Expiration**: Verification links should expire after 24 hours (handled in your verification logic)

## 📚 Additional Resources

- [EmailJS Documentation](https://www.emailjs.com/docs/)
- [EmailJS Dashboard](https://dashboard.emailjs.com/)
- [Email Template Best Practices](https://www.emailjs.com/docs/examples/reactjs/)

## 🆘 Support

If you encounter issues:

1. Check the browser console for errors
2. Verify your EmailJS dashboard shows successful sends
3. Test your template using EmailJS's built-in test feature
4. Check EmailJS status page for service issues

---

**Note**: The EmailJS integration works alongside Firebase's email verification system. If EmailJS fails, the system falls back to Firebase's default email verification.

