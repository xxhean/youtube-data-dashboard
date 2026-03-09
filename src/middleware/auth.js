const authMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const expectedApiKey = process.env.API_KEY;

    if (!apiKey) {
        return res.status(401).json({ success: false, message: 'API key is missing' });
    }

    if (apiKey !== expectedApiKey) {
        return res.status(403).json({ success: false, message: 'Invalid API key' });
    }

    next();
};

module.exports = authMiddleware;
