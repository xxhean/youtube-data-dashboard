const express = require('express');
const router = express.Router();
const passport = require('passport');
const db = require('../db');

// GET /auth/google — 发起 Google 登录
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// GET /auth/google/callback — Google 回调
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/?login=failed' }),
    (req, res) => {
        res.redirect('/?login=success');
    }
);

// GET /auth/me — 获取当前登录用户信息
router.get('/me', (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        res.json({
            success: true,
            user: {
                id: req.user.id,
                display_name: req.user.display_name,
                email: req.user.email,
                avatar_url: req.user.avatar_url,
                role: req.user.role
            }
        });
    } else {
        res.json({ success: false, user: null });
    }
});

// GET /auth/logout — 登出
router.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});
// =================
// Email Login Flow
// =================
const { Resend } = require('resend');
const crypto = require('crypto');
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// POST /auth/send-code
router.post('/send-code', async (req, res) => {
    const { email, turnstileToken } = req.body;
    if (!email || !turnstileToken) {
        return res.status(400).json({ success: false, message: 'Email and captcha token are required' });
    }

    // 1. Verify Turnstile
    try {
        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: new URLSearchParams({
                secret: process.env.TURNSTILE_SECRET_KEY,
                response: turnstileToken,
            })
        });
        const outcome = await verifyRes.json();
        if (!outcome.success) {
            return res.status(400).json({ success: false, message: 'Human verification failed' });
        }
    } catch (e) {
        console.error('Turnstile verification error:', e);
        return res.status(500).json({ success: false, message: 'Captcha service error' });
    }

    // 2. Generate and store code
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expire

    try {
        await db.query(
            "INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, $3)",
            [email.toLowerCase().trim(), code, expiresAt]
        );

        // 3. Send Email
        if (resend) {
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                to: email.toLowerCase().trim(),
                subject: 'Your Login Code - Video Dashboard',
                html: `<p>Your verification code is: <strong>${code}</strong></p><p>It will expire in 10 minutes.</p>`
            });
        } else {
            console.warn(`[DEV MODE] Verification code for ${email} is: ${code}`);
        }

        res.json({ success: true, message: 'Code sent successfully' });
    } catch (e) {
        console.error('Email sending error:', e);
        res.status(500).json({ success: false, message: 'Failed to send code' });
    }
});

// POST /auth/verify-code
router.post('/verify-code', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ success: false, message: 'Email and code are required' });
    }

    const targetEmail = email.toLowerCase().trim();

    try {
        // Find latest valid code
        const codeRec = await db.query(
            "SELECT * FROM verification_codes WHERE email = $1 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
            [targetEmail]
        );

        if (codeRec.rows.length === 0 || codeRec.rows[0].code !== code) {
            return res.status(400).json({ success: false, message: 'Invalid or expired code' });
        }

        // DB Cleanup (optional, delete used code)
        await db.query("DELETE FROM verification_codes WHERE email = $1", [targetEmail]);

        // Login User
        let userResult = await db.query("SELECT * FROM users WHERE email = $1", [targetEmail]);
        let user = userResult.rows[0];

        if (!user) {
            // Register new user
            const displayName = targetEmail.split('@')[0];
            const insertResult = await db.query(
                "INSERT INTO users (email, display_name, role) VALUES ($1, $2, $3) RETURNING *",
                [targetEmail, displayName, 'viewer']
            );
            user = insertResult.rows[0];
        } else {
            // Update last login
            await db.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);
        }

        // Establish session manually since we bypass passport strategy here
        req.login(user, (err) => {
            if (err) {
                console.error('Session error:', err);
                return res.status(500).json({ success: false, message: 'Failed to create session' });
            }
            res.json({ success: true, user: {
                id: user.id,
                display_name: user.display_name,
                email: user.email,
                avatar_url: user.avatar_url
            }});
        });

    } catch (e) {
        console.error('Verify code error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
// GET /auth/config - Expose public config to frontend
router.get('/config', (req, res) => {
    res.json({
        turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
    });
});

module.exports = router;
