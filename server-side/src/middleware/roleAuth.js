
const APIError = require("../utils/errors/APIError");

function roleAuth(...allowedRoles) {
    return (req, res, next) => {
        if (allowedRoles.includes(req.user.role)) {
            next();
        } else {
            next(new APIError(`You're not authorized`, 403));
        }
    };
}

module.exports = roleAuth;

/*
const AppError = require("../utils/errors/APIError");
const httpStatusText = require("../utils/httpStatusText");

const allowedTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          "You are not allowed to access this route, unauthorized user",
          403,
          httpStatusText.ERROR
        )
      );
    }
    next();
  };
};

module.exports = allowedTo;
*/
