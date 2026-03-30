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
                        <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 800;">Ticket Confirmed</h1>
                        <p style="color: #4b5563; font-size: 16px; margin-top: 5px;">Get ready for your journey with SmartRail</p>
                    </div>

                    <div style="background-color: #ffffff; padding: 40px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                        
                        <!-- PNR & TRAIN NUMBER TABLE -->
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-bottom: 2px dashed #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
                            <tr>
                                <td align="left" valign="top">
                                    <p style="color: #6b7280; font-size: 12px; font-weight: 700; text-transform: uppercase; margin: 0 0 4px 0;">PNR Number</p>
                                    <p style="color: #111827; font-size: 22px; font-weight: 800; margin: 0;">${pnr}</p>
                                </td>
                                <td align="right" valign="top">
                                    <p style="color: #6b7280; font-size: 12px; font-weight: 700; text-transform: uppercase; margin: 0 0 4px 0;">Train No</p>
                                    <p style="color: #111827; font-size: 22px; font-weight: 800; margin: 0;">#${trainNumber}</p>
                                </td>
                            </tr>
                        </table>

                        <!-- FROM / TO TABLE -->
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                            <tr>
                                <td align="left" width="40%">
                                    <p style="color: #6b7280; font-size: 11px; font-weight: 700; margin: 0 0 4px 0;">FROM</p>
                                    <p style="color: #111827; font-size: 18px; font-weight: 700; margin: 0;">${source}</p>
                                </td>
                                <td align="center" width="20%">
                                    <div style="width: 100%; height: 2px; background-color: #e5e7eb; margin-top: 10px;"></div>
                                </td>
                                <td align="right" width="40%">
                                    <p style="color: #6b7280; font-size: 11px; font-weight: 700; margin: 0 0 4px 0;">TO</p>
                                    <p style="color: #111827; font-size: 18px; font-weight: 700; margin: 0;">${destination}</p>
                                </td>
                            </tr>
                        </table>
                        
                        <p style="color: #374151; font-size: 15px; font-weight: 600; text-align: center; margin: 0 0 30px 0;">Date: ${journeyDate}</p>

                        <!-- PASSENGER DETAILS -->
                        <p style="color: #111827; font-size: 14px; font-weight: 700; border-top: 1px solid #f3f4f6; padding-top: 20px; margin: 0 0 15px 0;">PASSENGER DETAILS</p>
                        
                        <table width="100%" border="0" cellpadding="0" cellspacing="0">
                            ${passengers.map(p => `
                                <tr>
                                    <td style="padding-bottom: 10px;">
                                        <div style="background-color: #f9fafb; padding: 15px; border-radius: 12px; border: 1px solid #e5e7eb;">
                                            <p style="color: #1f2937; font-size: 16px; font-weight: 700; margin: 0 0 8px 0;">${p.name}</p>
                                            <p style="color: #4f46e5; font-size: 14px; font-weight: 800; margin: 0;">${p.status} - ${p.seatNumber || 'W/L'}</p>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </table>

                        <!-- TTE VERIFICATION QR -->
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 20px; border-top: 2px dashed #e5e7eb; padding-top: 30px;">
                            <tr>
                                <td align="center">
                                    <p style="color: #6b7280; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 15px 0;">TTE Verification QR</p>
                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${pnr}" alt="PNR QR Code" width="160" height="160" style="display: block; margin: 0 auto; border-radius: 12px; border: 4px solid #f9fafb; outline: 1px solid #e5e7eb;" />
                                    <p style="color: #111827; font-size: 18px; font-weight: 900; margin: 15px 0 0 0; letter-spacing: 4px;">${pnr}</p>
                                </td>
                            </tr>
                        </table>

                    </div>

                    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 30px 0 0 0; line-height: 1.5;">
                        Please carry a valid ID proof during your journey. Wish you a happy journey!
                        <br/>&copy; 2026 SmartRail.
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
 * Send a booking confirmation email
 */
export const sendBookingConfirmationEmail = async (email, bookingDetails) => {
    const { pnr, trainNumber, journeyDate, source, destination, passengers } = bookingDetails;
    
    try {
        if (!process.env.BREVO_API_KEY) return null;

        const payload = {
            sender: { email: SENDER_EMAIL, name: "SmartRail" },
            to: [{ email: email }],
            subject: `SmartRail Booking Confirmation - PNR: ${pnr}`,
            htmlContent: `
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

        if (!response.ok) throw new Error("Failed to send HTTP push email");
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
