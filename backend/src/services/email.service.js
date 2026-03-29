import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 465,
    secure: true, // Bypass rigorous port 587 cloud firewalls
    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS
    }
});

const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'support@smartrail.com';

/**
 * Send an OTP email for authentication
 */
export const sendOTPEmail = async (email, otpCode) => {
    try {
        if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
            console.error('[Email Service] BREVO_SMTP_USER or PASS is missing');
            throw new Error('Email service SMTP not configured');
        }

        const info = await transporter.sendMail({
            from: `"SmartRail" <${SENDER_EMAIL}>`,
            to: email,
            subject: 'SmartRail Verification Code',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; background-color: #f9fafb; border-radius: 20px; border: 1px solid #e5e7eb;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #111827; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">SmartRail</h1>
                        <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Intelligent Network Operations</p>
                    </div>
                    
                    <div style="background-color: #ffffff; padding: 32px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <p style="color: #374151; font-size: 16px; line-height: 24px;">To finish setting up your account, please enter the following verification code:</p>
                        
                        <div style="text-align: center; margin: 32px 0;">
                            <h1 style="color: #4F46E5; letter-spacing: 12px; font-size: 42px; font-weight: 900; margin: 0; display: inline-block;">${otpCode}</h1>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px; line-height: 20px; border-top: 1px solid #f3f4f6; pt-20px; margin-top: 24px; padding-top: 24px;"> This code is valid for 10 minutes. If you did not request this code, please ignore this message. </p>
                    </div>
                    
                    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 30px;"> &copy; 2026 SmartRail. All rights reserved. </p>
                </div>
            `,
        });

        return info;
    } catch (err) {
        console.error('[Email Service Error]:', err);
        throw err;
    }
};

/**
 * Send a booking confirmation email
 */
export const sendBookingConfirmationEmail = async (email, bookingDetails) => {
    const { pnr, trainNumber, journeyDate, source, destination, passengers } = bookingDetails;
    
    try {
        if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) return null;

        const info = await transporter.sendMail({
            from: `"SmartRail" <${SENDER_EMAIL}>`,
            to: email,
            subject: `SmartRail Booking Confirmation - PNR: ${pnr}`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; background-color: #f3f4f6; border-radius: 24px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 800;">Ticket Confirmed! 🎉</h1>
                        <p style="color: #4b5563; font-size: 16px;">Get ready for your journey with SmartRail</p>
                    </div>

                    <div style="background-color: #ffffff; padding: 40px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                        <div style="display: flex; justify-content: space-between; border-bottom: 2px dashed #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
                            <div>
                                <p style="color: #6b7280; font-size: 12px; font-weight: 700; text-transform: uppercase;">PNR Number</p>
                                <p style="color: #111827; font-size: 20px; font-weight: 800; margin: 0;">${pnr}</p>
                            </div>
                            <div style="text-align: right;">
                                <p style="color: #6b7280; font-size: 12px; font-weight: 700; text-transform: uppercase;">Train No</p>
                                <p style="color: #111827; font-size: 20px; font-weight: 800; margin: 0;">#${trainNumber}</p>
                            </div>
                        </div>

                        <div style="margin-bottom: 30px;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div style="flex: 1;">
                                    <p style="color: #6b7280; font-size: 11px; font-weight: 700;">FROM</p>
                                    <p style="color: #111827; font-size: 16px; font-weight: 700;">${source}</p>
                                </div>
                                <div style="flex: 1; text-align: center; padding: 0 20px;">
                                     <div style="height: 2px; background-color: #e5e7eb; position: relative;">
                                        <div style="position: absolute; width: 8px; height: 8px; border-radius: 50%; background-color: #4f46e5; top: -3px; left: 0;"></div>
                                        <div style="position: absolute; width: 8px; height: 8px; border-radius: 50%; background-color: #10b981; top: -3px; right: 0;"></div>
                                     </div>
                                </div>
                                <div style="flex: 1; text-align: right;">
                                    <p style="color: #6b7280; font-size: 11px; font-weight: 700;">TO</p>
                                    <p style="color: #111827; font-size: 16px; font-weight: 700;">${destination}</p>
                                </div>
                            </div>
                            <p style="color: #374151; font-size: 14px; font-weight: 600; text-align: center; margin-top: 15px;">Date: ${journeyDate}</p>
                        </div>

                        <p style="color: #111827; font-size: 14px; font-weight: 700; border-top: 1px solid #f3f4f6; padding-top: 20px; margin-bottom: 12px;">PASSENGER DETAILS</p>
                        ${passengers.map(p => `
                            <div style="display: flex; justify-content: space-between; background-color: #f9fafb; padding: 12px; border-radius: 12px; margin-bottom: 8px;">
                                <div style="color: #374151; font-size: 14px; font-weight: 600;">${p.name}</div>
                                <div style="color: #4f46e5; font-size: 14px; font-weight: 800;">${p.status} - ${p.seatNumber || 'W/L'}</div>
                            </div>
                        `).join('')}
                    </div>

                    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 30px;">
                        Please carry a valid ID proof during your journey. Wish you a happy journey!
                        <br/>&copy; 2026 SmartRail.
                    </p>
                </div>
            `,
        });

        return info;
    } catch (err) {
        console.error('[Email Service Error]:', err);
        throw err;
    }
};

export default {
    sendOTPEmail,
    sendBookingConfirmationEmail
};
