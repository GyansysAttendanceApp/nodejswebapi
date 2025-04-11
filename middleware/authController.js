const jwt = require('jsonwebtoken');
require('dotenv').config();

const getToken = (req, res) => {
  const { apiId, apiKey } = req.body;

  if (apiId === process.env.API_ID && apiKey === process.env.API_KEY) {
    const token = jwt.sign({ apiId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token });
  } else {
    return res.status(401).json({ message: 'Invalid API credentials' });
  }
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
