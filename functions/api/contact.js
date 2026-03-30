/**
 * POST /api/contact
 * Stores a contact form submission in D1 and optionally sends
 * a notification email via Resend (set RESEND_API_KEY + NOTIFICATION_EMAIL secrets).
 *
 * @param {EventContext} context
 */
export async function onRequestPost(context) {
    const { request, env } = context;

    // Parse body
    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid request body.' }, 400);
    }

    const { name, email, company, message } = body;

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
        return json({ error: 'Name, email, and message are required.' }, 400);
    }

    if (!isValidEmail(email)) {
        return json({ error: 'Please provide a valid email address.' }, 400);
    }

    if (message.trim().length < 10) {
        return json({ error: 'Message must be at least 10 characters.' }, 400);
    }

    // Store in D1
    if (!env.DB) {
        return json({ error: 'Database not configured. Please add D1 binding in Cloudflare dashboard.' }, 503);
    }
    try {
        await env.DB.prepare(
            `INSERT INTO contacts (name, email, company, message)
             VALUES (?, ?, ?, ?)`
        )
        .bind(
            name.trim(),
            email.trim().toLowerCase(),
            company?.trim() || null,
            message.trim()
        )
        .run();
    } catch (err) {
        console.error('D1 insert error:', err);
        return json({ error: 'Failed to save your message. Please try again.' }, 500);
    }

    // Send notification email (optional — only runs if secrets are configured)
    if (env.RESEND_API_KEY && env.NOTIFICATION_EMAIL) {
        await sendNotification(env.RESEND_API_KEY, env.NOTIFICATION_EMAIL, {
            name: name.trim(),
            email: email.trim(),
            company: company?.trim() || 'N/A',
            message: message.trim(),
        });
    }

    return json({
        success: true,
        message: "Thank you! We'll be in touch within 24 hours.",
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

async function sendNotification(apiKey, to, { name, email, company, message }) {
    try {
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'Carat Cloud <noreply@caratcloud.com>',
                to: [to],
                subject: `New contact from ${name}`,
                html: `
                    <h2>New Contact Submission</h2>
                    <table>
                        <tr><td><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
                        <tr><td><strong>Email</strong></td><td>${escapeHtml(email)}</td></tr>
                        <tr><td><strong>Company</strong></td><td>${escapeHtml(company)}</td></tr>
                    </table>
                    <h3>Message</h3>
                    <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
                `,
            }),
        });
    } catch (err) {
        // Non-fatal — submission is already saved to DB
        console.error('Resend error:', err);
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
