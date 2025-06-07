const jwt = require('jsonwebtoken');
const APIError = require('../utils/errors/APIError');

function protectMW(req, res, next) {
    try {
        let token = res.headers.authorization;
        if (!token || !token.startsWith('Bearer ')) {
            throw new APIError('No token provided or invalid token format', 401);
        }
        token = token.split(" ")[1];
        let decodedData = jwt.verify(token, process.env.SECRETKEY);
        req.user = decodedData;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            throw new APIError("Token has expired. Please login again", 401);
        } else if (err.name === 'JsonWebTokenError') {
            throw new APIError("Token is invalid", 401);
        } else {
            throw new APIError("Authentication faild.", 401);
        }
    }
}

module.exports = protectMW;