/**
 * POST /api/subscribe
 * Stores an email signup in D1 and optionally sends
 * a welcome email via Resend (set RESEND_API_KEY secret).
 *
 * @param {EventContext} context
 */
export async function onRequestPost(context) {
    const { request, env } = context;

    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid request body.' }, 400);
    }

    const { email } = body;

    if (!email?.trim()) {
        return json({ error: 'Email address is required.' }, 400);
    }

    if (!isValidEmail(email)) {
        return json({ error: 'Please provide a valid email address.' }, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Store in D1 — handle duplicate gracefully
    if (!env.DB) {
        return json({ error: 'Database not configured. Please add D1 binding in Cloudflare dashboard.' }, 503);
    }
    try {
        await env.DB.prepare(
            `INSERT INTO subscribers (email) VALUES (?)`
        )
        .bind(normalizedEmail)
        .run();
    } catch (err) {
        // UNIQUE constraint = already subscribed
        if (err?.message?.includes('UNIQUE constraint failed')) {
            return json({ success: true, message: "You're already on the list — we'll be in touch!" });
        }
        console.error('D1 insert error:', err);
        return json({ error: 'Failed to subscribe. Please try again.' }, 500);
    }

    // Send welcome email (optional)
    if (env.RESEND_API_KEY) {
        await sendWelcome(env.RESEND_API_KEY, normalizedEmail);
    }

    return json({
        success: true,
        message: "You're on the list! We'll be in touch with early access.",
    });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function sendWelcome(apiKey, email) {
    try {
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Carat Cloud <noreply@caratcloud.net>',
                to: [email],
                subject: 'Welcome to Carat Cloud',
                html: `
                    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #191c1e;">
                        <h1 style="font-size: 2rem; color: #385d8e;">Welcome to Carat Cloud.</h1>
                        <p style="font-size: 1.1rem; line-height: 1.7; color: #414751;">
                            Thank you for joining our waitlist. You're among the first to experience
                            the most sophisticated cloud ecosystem for the diamond and jewelry industry.
                        </p>
                        <p style="font-size: 1.1rem; line-height: 1.7; color: #414751;">
                            We'll reach out with exclusive early access details soon.
                        </p>
                        <p style="margin-top: 2rem; color: #717783; font-size: 0.85rem;">
                            — The Carat Cloud Team
                        </p>
                    </div>
                `,
            }),
        });
    } catch (err) {
        // Non-fatal
        console.error('Resend error:', err);
    }
}
