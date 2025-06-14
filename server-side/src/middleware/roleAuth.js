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