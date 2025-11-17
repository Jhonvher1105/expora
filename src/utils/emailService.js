import emailjs from '@emailjs/browser';

// EmailJS Configuration for general emails (verification, password reset)
// Get these values from your EmailJS dashboard: https://dashboard.emailjs.com/
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

// EmailJS Configuration for booking notifications (separate service)
const NOTIFICATION_SERVICE_ID = import.meta.env.VITE_EMAILJS_NOTIFICATION_SERVICE_ID || 'service_cdkso21';
const NOTIFICATION_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_NOTIFICATION_PUBLIC_KEY || EMAILJS_PUBLIC_KEY;

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

/**
 * Send booking confirmation email to guest
 * @param {string} userEmail - Guest's email address
 * @param {string} userName - Guest's name
 * @param {Object} bookingData - Booking information
 * @param {string} bookingData.bookingId - Booking ID
 * @param {string} bookingData.listingTitle - Property/listing title
 * @param {string} bookingData.bookingDates - Formatted booking dates (e.g., "Jan 15, 2024 - Jan 20, 2024")
 * @param {number} bookingData.totalPrice - Total booking price
 * @param {number} bookingData.guests - Number of guests
 * @param {number} bookingData.nights - Number of nights
 * @returns {Promise} - Promise that resolves when email is sent
 */
export const sendBookingConfirmationEmail = async (userEmail, userName, bookingData) => {
  try {
    // Validate notification configuration
    if (!NOTIFICATION_SERVICE_ID || NOTIFICATION_SERVICE_ID === 'YOUR_SERVICE_ID' || 
        !NOTIFICATION_PUBLIC_KEY || NOTIFICATION_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
      console.warn('EmailJS notification credentials are not configured. Skipping email notification.');
      return { success: false, message: 'EmailJS notification not configured' };
    }

    // Validate required parameters
    if (!userEmail) {
      console.warn('Guest email is missing. Skipping email notification.');
      return { success: false, message: 'Guest email is required' };
    }

    // Use a separate template ID for booking confirmations
    const BOOKING_CONFIRMATION_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_BOOKING_CONFIRMATION_TEMPLATE_ID || 'template_y4d77pg';

    // Validate template ID
    if (!BOOKING_CONFIRMATION_TEMPLATE_ID || BOOKING_CONFIRMATION_TEMPLATE_ID === 'YOUR_TEMPLATE_ID') {
      console.warn('Booking confirmation template ID is not configured. Skipping email notification.');
      return { success: false, message: 'Booking confirmation template ID not configured' };
    }

    const templateParams = {
      user_email: userEmail,
      user_name: userName || 'Guest',
      to_email: userEmail,
      booking_id: bookingData.bookingId || 'N/A',
      listing_title: bookingData.listingTitle || 'Property',
      booking_dates: bookingData.bookingDates || 'N/A',
      total_price: `₱${(bookingData.totalPrice || 0).toFixed(2)}`,
      guests: bookingData.guests || 1,
      nights: bookingData.nights || 1,
    };

    // Log the configuration for debugging (without sensitive data)
    console.log('Sending booking confirmation email:', {
      serviceId: NOTIFICATION_SERVICE_ID,
      templateId: BOOKING_CONFIRMATION_TEMPLATE_ID,
      guestEmail: userEmail,
      hasPublicKey: !!NOTIFICATION_PUBLIC_KEY,
    });

    // Use notification-specific service ID and public key
    const response = await emailjs.send(
      NOTIFICATION_SERVICE_ID,
      BOOKING_CONFIRMATION_TEMPLATE_ID,
      templateParams,
      NOTIFICATION_PUBLIC_KEY
    );

    console.log('Booking confirmation email sent successfully:', response);
    return { success: true, message: 'Booking confirmation email sent successfully' };
  } catch (error) {
    // Enhanced error logging with more details
    console.error('Failed to send booking confirmation email:', {
      error: error,
      message: error.message,
      text: error.text,
      status: error.status,
      serviceId: NOTIFICATION_SERVICE_ID,
      templateId: import.meta.env.VITE_EMAILJS_BOOKING_CONFIRMATION_TEMPLATE_ID || 'template_y4d77pg',
      guestEmail: userEmail,
    });

    // Provide more specific error messages
    let errorMessage = 'Failed to send booking confirmation email';
    if (error.status === 400) {
      errorMessage = 'EmailJS returned 400 Bad Request. This usually means:\n' +
        '1. Template ID does not exist or is incorrect\n' +
        '2. Template variables do not match the template (missing or incorrect variable names)\n' +
        '3. Service ID is invalid\n' +
        '4. Public key is invalid or expired\n\n' +
        `Template ID used: ${import.meta.env.VITE_EMAILJS_BOOKING_CONFIRMATION_TEMPLATE_ID || 'template_y4d77pg'}\n` +
        `Service ID used: ${NOTIFICATION_SERVICE_ID}\n` +
        'Please check your EmailJS dashboard and ensure:\n' +
        '- The template exists and has all required variables: user_email, user_name, to_email, booking_id, listing_title, booking_dates, total_price, guests, nights\n' +
        '- The service ID is correct\n' +
        '- The public key is valid';
    } else if (error.status === 401) {
      errorMessage = 'EmailJS authentication failed. Check your public key.';
    } else if (error.status === 404) {
      errorMessage = 'EmailJS template or service not found. Check your template ID and service ID.';
    } else if (error.text) {
      errorMessage = `EmailJS error: ${error.text}`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Don't throw error - email failure shouldn't break the booking flow
    return { success: false, message: errorMessage };
  }
};

/**
 * Send booking cancellation email to guest
 * @param {string} userEmail - Guest's email address
 * @param {string} userName - Guest's name
 * @param {Object} bookingData - Booking information
 * @param {string} bookingData.bookingId - Booking ID
 * @param {string} bookingData.listingTitle - Property/listing title
 * @param {string} bookingData.bookingDates - Formatted booking dates
 * @param {number} bookingData.totalPrice - Total booking price
 * @param {number} bookingData.guests - Number of guests
 * @param {number} bookingData.nights - Number of nights
 * @param {boolean} bookingData.paymentStatus - Payment status ('paid' or 'pending')
 * @param {string} bookingData.refundInfo - Refund information (optional)
 * @returns {Promise} - Promise that resolves when email is sent
 */
export const sendBookingCancellationEmail = async (userEmail, userName, bookingData) => {
  try {
    // Validate notification configuration
    if (!NOTIFICATION_SERVICE_ID || NOTIFICATION_SERVICE_ID === 'YOUR_SERVICE_ID' || 
        !NOTIFICATION_PUBLIC_KEY || NOTIFICATION_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
      console.warn('EmailJS notification credentials are not configured. Skipping email notification.');
      return { success: false, message: 'EmailJS notification not configured' };
    }

    // Validate required parameters
    if (!userEmail) {
      console.warn('Guest email is missing. Skipping email notification.');
      return { success: false, message: 'Guest email is required' };
    }

    // Use a separate template ID for booking cancellations
    const BOOKING_CANCELLATION_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_BOOKING_CANCELLATION_TEMPLATE_ID || 'template_ztbtzyc';

    // Validate template ID
    if (!BOOKING_CANCELLATION_TEMPLATE_ID || BOOKING_CANCELLATION_TEMPLATE_ID === 'YOUR_TEMPLATE_ID') {
      console.warn('Booking cancellation template ID is not configured. Skipping email notification.');
      return { success: false, message: 'Booking cancellation template ID not configured' };
    }

    const wasPaid = bookingData.paymentStatus === 'paid';
    const refundInfo = bookingData.refundInfo || 
      (wasPaid ? 'A refund will be processed to your original payment method within 5-7 business days.' : 'No payment was made for this booking.');

    const templateParams = {
      user_email: userEmail,
      user_name: userName || 'Guest',
      to_email: userEmail,
      booking_id: bookingData.bookingId || 'N/A',
      listing_title: bookingData.listingTitle || 'Property',
      booking_dates: bookingData.bookingDates || 'N/A',
      total_price: `₱${(bookingData.totalPrice || 0).toFixed(2)}`,
      guests: bookingData.guests || 1,
      nights: bookingData.nights || 1,
      payment_status: wasPaid ? 'Paid' : 'Pending',
      refund_info: refundInfo,
    };

    // Log the configuration for debugging (without sensitive data)
    console.log('Sending booking cancellation email:', {
      serviceId: NOTIFICATION_SERVICE_ID,
      templateId: BOOKING_CANCELLATION_TEMPLATE_ID,
      guestEmail: userEmail,
      hasPublicKey: !!NOTIFICATION_PUBLIC_KEY,
    });

    // Use notification-specific service ID and public key
    const response = await emailjs.send(
      NOTIFICATION_SERVICE_ID,
      BOOKING_CANCELLATION_TEMPLATE_ID,
      templateParams,
      NOTIFICATION_PUBLIC_KEY
    );

    console.log('Booking cancellation email sent successfully:', response);
    return { success: true, message: 'Booking cancellation email sent successfully' };
  } catch (error) {
    // Enhanced error logging with more details
    console.error('Failed to send booking cancellation email:', {
      error: error,
      message: error.message,
      text: error.text,
      status: error.status,
      serviceId: NOTIFICATION_SERVICE_ID,
      templateId: import.meta.env.VITE_EMAILJS_BOOKING_CANCELLATION_TEMPLATE_ID || 'template_ztbtzyc',
      guestEmail: userEmail,
    });

    // Provide more specific error messages
    let errorMessage = 'Failed to send booking cancellation email';
    if (error.status === 400) {
      errorMessage = 'EmailJS returned 400 Bad Request. This usually means:\n' +
        '1. Template ID does not exist or is incorrect\n' +
        '2. Template variables do not match the template (missing or incorrect variable names)\n' +
        '3. Service ID is invalid\n' +
        '4. Public key is invalid or expired\n\n' +
        `Template ID used: ${import.meta.env.VITE_EMAILJS_BOOKING_CANCELLATION_TEMPLATE_ID || 'template_ztbtzyc'}\n` +
        `Service ID used: ${NOTIFICATION_SERVICE_ID}\n` +
        'Please check your EmailJS dashboard and ensure:\n' +
        '- The template exists and has all required variables: user_email, user_name, to_email, booking_id, listing_title, booking_dates, total_price, guests, nights, payment_status, refund_info\n' +
        '- The service ID is correct\n' +
        '- The public key is valid';
    } else if (error.status === 401) {
      errorMessage = 'EmailJS authentication failed. Check your public key.';
    } else if (error.status === 404) {
      errorMessage = 'EmailJS template or service not found. Check your template ID and service ID.';
    } else if (error.text) {
      errorMessage = `EmailJS error: ${error.text}`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Don't throw error - email failure shouldn't break the cancellation flow
    return { success: false, message: errorMessage };
  }
};

/**
 * Send new booking notification email to host
 * @param {string} hostEmail - Host's email address
 * @param {string} hostName - Host's name
 * @param {Object} bookingData - Booking information
 * @param {string} bookingData.bookingId - Booking ID
 * @param {string} bookingData.listingTitle - Property/listing title
 * @param {string} bookingData.bookingDates - Formatted booking dates (e.g., "Jan 15, 2024 - Jan 20, 2024")
 * @param {number} bookingData.totalPrice - Total booking price
 * @param {number} bookingData.guests - Number of guests
 * @param {number} bookingData.nights - Number of nights
 * @param {string} bookingData.guestName - Guest's name
 * @returns {Promise} - Promise that resolves when email is sent
 */
export const sendHostBookingNotificationEmail = async (hostEmail, hostName, bookingData) => {
  try {
    // Validate notification configuration
    if (!NOTIFICATION_SERVICE_ID || NOTIFICATION_SERVICE_ID === 'YOUR_SERVICE_ID' || 
        !NOTIFICATION_PUBLIC_KEY || NOTIFICATION_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
      console.warn('EmailJS notification credentials are not configured. Skipping email notification.');
      return { success: false, message: 'EmailJS notification not configured' };
    }

    // Validate required parameters
    if (!hostEmail) {
      console.warn('Host email is missing. Skipping email notification.');
      return { success: false, message: 'Host email is required' };
    }

    // Use a separate template ID for host booking notifications
    const HOST_BOOKING_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_HOST_BOOKING_TEMPLATE_ID || 'template_y4d77pg';

    // Validate template ID
    if (!HOST_BOOKING_TEMPLATE_ID || HOST_BOOKING_TEMPLATE_ID === 'YOUR_TEMPLATE_ID') {
      console.warn('Host booking template ID is not configured. Skipping email notification.');
      return { success: false, message: 'Host booking template ID not configured' };
    }

    const templateParams = {
      user_email: hostEmail,
      user_name: hostName || 'Host',
      to_email: hostEmail,
      booking_id: bookingData.bookingId || 'N/A',
      listing_title: bookingData.listingTitle || 'Property',
      booking_dates: bookingData.bookingDates || 'N/A',
      total_price: `₱${(bookingData.totalPrice || 0).toFixed(2)}`,
      guests: bookingData.guests || 1,
      nights: bookingData.nights || 1,
      guest_name: bookingData.guestName || 'Guest',
    };

    // Log the configuration for debugging (without sensitive data)
    console.log('Sending host booking notification email:', {
      serviceId: NOTIFICATION_SERVICE_ID,
      templateId: HOST_BOOKING_TEMPLATE_ID,
      hostEmail: hostEmail,
      hasPublicKey: !!NOTIFICATION_PUBLIC_KEY,
    });

    // Use notification-specific service ID and public key
    const response = await emailjs.send(
      NOTIFICATION_SERVICE_ID,
      HOST_BOOKING_TEMPLATE_ID,
      templateParams,
      NOTIFICATION_PUBLIC_KEY
    );

    console.log('Host booking notification email sent successfully:', response);
    return { success: true, message: 'Host booking notification email sent successfully' };
  } catch (error) {
    // Enhanced error logging with more details
    console.error('Failed to send host booking notification email:', {
      error: error,
      message: error.message,
      text: error.text,
      status: error.status,
      serviceId: NOTIFICATION_SERVICE_ID,
      templateId: import.meta.env.VITE_EMAILJS_HOST_BOOKING_TEMPLATE_ID || 'template_y4d77pg',
      hostEmail: hostEmail,
    });

    // Provide more specific error messages
    let errorMessage = 'Failed to send host booking notification email';
    if (error.status === 400) {
      errorMessage = 'EmailJS returned 400 Bad Request. This usually means:\n' +
        '1. Template ID does not exist or is incorrect\n' +
        '2. Template variables do not match the template (missing or incorrect variable names)\n' +
        '3. Service ID is invalid\n' +
        '4. Public key is invalid or expired\n\n' +
        `Template ID used: ${import.meta.env.VITE_EMAILJS_HOST_BOOKING_TEMPLATE_ID || 'template_y4d77pg'}\n` +
        `Service ID used: ${NOTIFICATION_SERVICE_ID}\n` +
        'Please check your EmailJS dashboard and ensure:\n' +
        '- The template exists and has all required variables: user_email, user_name, to_email, booking_id, listing_title, booking_dates, total_price, guests, nights, guest_name\n' +
        '- The service ID is correct\n' +
        '- The public key is valid';
    } else if (error.status === 401) {
      errorMessage = 'EmailJS authentication failed. Check your public key.';
    } else if (error.status === 404) {
      errorMessage = 'EmailJS template or service not found. Check your template ID and service ID.';
    } else if (error.text) {
      errorMessage = `EmailJS error: ${error.text}`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Don't throw error - email failure shouldn't break the booking flow
    return { success: false, message: errorMessage };
  }
};

