const jwt = require("jsonwebtoken");
const APIError = require("../utils/errors/APIError"); 

function protectMW(req, res, next) {
  try {
    let token = req.headers.authorization; 
    if (!token || !token.startsWith("Bearer ")) {
    
      return next(
        new APIError("No token provided or invalid token format", 401)
      );
    }
    token = token.split(" ")[1];
    let decodedData = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decodedData; 
    next(); 
  } catch (err) {
  
    if (err.name === "TokenExpiredError") {
      return next(new APIError("Token has expired. Please login again", 401));
    } else if (err.name === "JsonWebTokenError") {
      return next(new APIError("Token is invalid", 401));
    } else {
      return next(new APIError("Authentication failed.", 401)); 
    }
  }
}

module.exports = protectMW;
