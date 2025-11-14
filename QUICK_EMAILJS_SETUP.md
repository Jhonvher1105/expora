# Quick EmailJS Setup

## ⚡ Quick Start

1. **Create `.env` file** in the root directory (same level as `package.json`)

2. **Add these variables:**
   ```env
   VITE_EMAILJS_SERVICE_ID=your_service_id_here
   VITE_EMAILJS_TEMPLATE_ID=your_template_id_here
   VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
   ```

3. **Get your credentials from EmailJS:**
   - Sign up at https://www.emailjs.com/
   - Go to Dashboard → Email Services → Copy Service ID
   - Go to Dashboard → Email Templates → Copy Template ID  
   - Go to Dashboard → Account → General → Copy Public Key

4. **Create Email Template:**
   - Copy HTML from `src/utils/emailVerificationTemplate.html`
   - Paste into EmailJS template editor
   - Use variables: `{{user_name}}`, `{{user_email}}`, `{{verification_link}}`

5. **Restart your dev server** after adding `.env` file

## 📝 Example .env file

```env
VITE_EMAILJS_SERVICE_ID=service_abc123
VITE_EMAILJS_TEMPLATE_ID=template_xyz789
VITE_EMAILJS_PUBLIC_KEY=abcdefghijklmnop
```

## ⚠️ Important

- Never commit `.env` to git (it's already in `.gitignore`)
- Restart dev server after changing `.env`
- Free tier: 200 emails/month

For detailed instructions, see `EMAILJS_SETUP.md`

