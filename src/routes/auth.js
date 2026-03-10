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

module.exports = router;
