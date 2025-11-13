import emailjs from '@emailjs/browser';

// EmailJS Configuration
// Get these values from your EmailJS dashboard: https://dashboard.emailjs.com/
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

// Initialize EmailJS
if (EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

/**
 * Send email verification link using EmailJS
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name
 * @param {string} verificationLink - The verification link to send
 * @returns {Promise} - Promise that resolves when email is sent
 */
export const sendVerificationEmail = async (userEmail, userName, verificationLink) => {
  try {
    // Validate configuration
    if (EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID' || 
        EMAILJS_TEMPLATE_ID === 'YOUR_TEMPLATE_ID' || 
        EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
      throw new Error('EmailJS is not configured. Please set up your EmailJS credentials in .env file.');
    }

    const templateParams = {
      user_email: userEmail,
      user_name: userName || 'User',
      verification_link: verificationLink,
      to_email: userEmail,
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('Email sent successfully:', response);
    return { success: true, message: 'Verification email sent successfully' };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error(error.message || 'Failed to send verification email. Please try again.');
  }
};

/**
 * Send password reset email using EmailJS
 * @param {string} userEmail - User's email address
 * @param {string} resetLink - The password reset link
 * @param {string} userName - User's name (optional)
 * @returns {Promise} - Promise that resolves when email is sent
 */
export const sendPasswordResetEmail = async (userEmail, resetLink, userName = 'User') => {
  try {
    // Validate configuration
    if (EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID' || 
        EMAILJS_TEMPLATE_ID === 'YOUR_TEMPLATE_ID' || 
        EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
      throw new Error('EmailJS is not configured. Please set up your EmailJS credentials in .env file.');
    }

    const templateParams = {
      user_email: userEmail,
      user_name: userName,
      reset_link: resetLink,
      to_email: userEmail,
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID, // You can create a separate template for password reset
      templateParams
    );

    console.log('Password reset email sent successfully:', response);
    return { success: true, message: 'Password reset email sent successfully' };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error(error.message || 'Failed to send password reset email. Please try again.');
  }
};

