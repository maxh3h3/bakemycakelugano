import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error('Missing RESEND_API_KEY environment variable');
}

// Server-side Resend client
export const resend = new Resend(resendApiKey);

// Email configuration
export const emailConfig = {
  from: process.env.RESEND_FROM_EMAIL || 'info@bakemycakelugano.ch',
  // Owner emails - send notifications to both addresses
  ownerEmails: [
    'info@bakemycakelugano.ch',
    'luganobakemycake@gmail.com',
  ],
};

