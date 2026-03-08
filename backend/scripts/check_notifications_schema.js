import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function introspect() {
    const errRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/notifications`, {
        method: 'POST',
        headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({})
    });
    console.log("Empty insert error:", await errRes.text());
}

introspect();
