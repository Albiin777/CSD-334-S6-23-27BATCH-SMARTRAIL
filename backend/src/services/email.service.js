import dotenv from 'dotenv';

dotenv.config();

const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'support@smartrail.com';

/**
 * Send an OTP email for authentication
 */
export const sendOTPEmail = async (email, otpCode) => {
    try {
        if (!process.env.BREVO_API_KEY) {
            console.error('[Email Service] BREVO_API_KEY is missing');
            throw new Error('Email service API key not configured');
        }

        const payload = {
            sender: { email: SENDER_EMAIL, name: "SmartRail" },
            to: [{ email: email }],
            subject: 'SmartRail Verification Code',
            htmlContent: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; background-color: #f3f4f6; border-radius: 24px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 800;">SmartRail Verification</h1>
                        <p style="color: #4b5563; font-size: 16px; margin-top: 8px;">Your one-time verification code</p>
                    </div>
                    <div style="background-color: #ffffff; padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                        <p style="color: #6b7280; font-size: 14px; font-weight: 600; margin-bottom: 20px;">Enter this code to verify your identity. It expires in 10 minutes.</p>
                        <div style="background-color: #f9fafb; border: 2px dashed #e5e7eb; border-radius: 16px; padding: 24px; display: inline-block; min-width: 200px;">
                            <span style="font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #111827; font-family: monospace;">${otpCode}</span>
                        </div>
                        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">If you did not request this code, please ignore this email.</p>
                    </div>
                    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 30px;">&copy; 2026 SmartRail. All rights reserved.</p>
                </div>
            `
        };

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Brevo API Error: ${errorData}`);
        }

        return await response.json();
    } catch (err) {
        console.error('[Email Service Error]:', err);
        throw err;
    }
};

/**
 * Send a booking confirmation email with QR code
 */
export const sendBookingConfirmationEmail = async (email, bookingDetails) => {
    const { pnr, trainNumber, journeyDate, source, destination, passengers } = bookingDetails;

    try {
        if (!process.env.BREVO_API_KEY) return null;

        const passengerRows = passengers.map(p => `
            <tr>
                <td style="padding-bottom: 10px;">
                    <div style="background-color: #f9fafb; padding: 15px 18px; border-radius: 12px; border: 1px solid #e5e7eb;">
                        <p style="color: #1f2937; font-size: 16px; font-weight: 700; margin: 0 0 6px 0;">${p.name}</p>
                        <p style="color: #4f46e5; font-size: 14px; font-weight: 800; margin: 0;">${p.status} &nbsp;&mdash;&nbsp; ${p.seatNumber || 'Waitlist'}</p>
                    </div>
                </td>
            </tr>
        `).join('');

        const payload = {
            sender: { email: SENDER_EMAIL, name: "SmartRail" },
            to: [{ email: email }],
            subject: `SmartRail Booking Confirmation - PNR: ${pnr}`,
            htmlContent: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; background-color: #f3f4f6; border-radius: 24px;">
                    
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 800;">Ticket Confirmed</h1>
                        <p style="color: #4b5563; font-size: 16px; margin-top: 8px;">Get ready for your journey with SmartRail</p>
                    </div>

                    <div style="background-color: #ffffff; padding: 32px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">

                        <!-- PNR & TRAIN NUMBER -->
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-bottom: 2px dashed #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
                            <tr>
                                <td align="left" valign="top" width="50%">
                                    <p style="color: #6b7280; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px 0;">PNR Number</p>
                                    <p style="color: #111827; font-size: 20px; font-weight: 900; margin: 0; font-family: monospace;">${pnr}</p>
                                </td>
                                <td align="right" valign="top" width="50%">
                                    <p style="color: #6b7280; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px 0;">Train No</p>
                                    <p style="color: #111827; font-size: 20px; font-weight: 900; margin: 0; font-family: monospace;">#${trainNumber}</p>
                                </td>
                            </tr>
                        </table>

                        <!-- FROM / TO -->
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                            <tr>
                                <td align="left" valign="top" width="45%">
                                    <p style="color: #6b7280; font-size: 11px; font-weight: 700; text-transform: uppercase; margin: 0 0 4px 0;">From</p>
                                    <p style="color: #111827; font-size: 20px; font-weight: 700; margin: 0;">${source}</p>
                                </td>
                                <td align="center" valign="middle" width="10%">
                                    <p style="color: #9ca3af; font-size: 20px; margin: 10px 0 0 0;">&rarr;</p>
                                </td>
                                <td align="right" valign="top" width="45%">
                                    <p style="color: #6b7280; font-size: 11px; font-weight: 700; text-transform: uppercase; margin: 0 0 4px 0;">To</p>
                                    <p style="color: #111827; font-size: 20px; font-weight: 700; margin: 0;">${destination}</p>
                                </td>
                            </tr>
                        </table>

                        <p style="color: #374151; font-size: 14px; font-weight: 600; text-align: center; margin: 0 0 24px 0; padding-top: 4px;">Date: ${journeyDate}</p>

                        <!-- PASSENGER DETAILS -->
                        <p style="color: #111827; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-top: 1px solid #f3f4f6; padding-top: 20px; margin: 0 0 12px 0;">Passenger Details</p>

                        <table width="100%" border="0" cellpadding="0" cellspacing="0">
                            ${passengerRows}
                        </table>

                        <!-- QR CODE -->
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 24px; border-top: 2px dashed #e5e7eb; padding-top: 28px;">
                            <tr>
                                <td align="center">
                                    <p style="color: #6b7280; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px 0;">TTE Verification QR</p>
                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${pnr}" alt="QR Code" width="160" height="160" style="display: block; margin: 0 auto; border-radius: 10px; border: 4px solid #f9fafb; outline: 1px solid #e5e7eb;" />
                                    <p style="color: #111827; font-size: 18px; font-weight: 900; margin: 14px 0 0 0; letter-spacing: 4px; font-family: monospace;">${pnr}</p>
                                </td>
                            </tr>
                        </table>

                    </div>

                    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 28px 0 0 0; line-height: 1.6;">
                        Please carry a valid ID proof during your journey.<br/>
                        &copy; 2026 SmartRail. All rights reserved.
                    </p>
                </div>
            `
        };

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Failed to send confirmation email");
        return await response.json();
    } catch (err) {
        console.error('[Email Service Error]:', err);
        throw err;
    }
};

export default {
    sendOTPEmail,
    sendBookingConfirmationEmail
};
