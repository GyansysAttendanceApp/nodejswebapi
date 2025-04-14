const jwt = require('jsonwebtoken');

const crypto = require('crypto');
require('dotenv').config();

const getToken = (req, res) => {
  const { timestamp } = req.body;
  const clientSignature = req.headers['x-signature'];

  if (!timestamp || !clientSignature) {
    return res.status(400).json({ message: 'Missing timestamp or signature' });
  }

  // Prevent replay attacks: Reject timestamps older than 2 mins
  const now = Date.now();
  const ts = parseInt(timestamp);
  if (Math.abs(now - ts) > 2 * 60 * 1000) {
    return res.status(403).json({ message: 'Timestamp expired' });
  }

  // Create HMAC with secret
  const hmac = crypto.createHmac('sha256', process.env.API_ID);
  hmac.update(timestamp);
  const expectedSignature = hmac.digest('hex');

  if (clientSignature !== expectedSignature) {
    return res.status(401).json({ message: 'Invalid signature' });
  }

  // Valid → issue token
  const token = jwt.sign({ access: 'frontend' }, process.env.JWT_SECRET, { expiresIn: '20m' });
  return res.json({ token });
};

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
  
    if (!authHeader) return res.sendStatus(401);
  
    const token = authHeader.split(' ')[1];
  
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.sendStatus(403);
      req.apiId = decoded.apiId;
      next();
    });
  };
  
  module.exports = { getToken, verifyToken };
