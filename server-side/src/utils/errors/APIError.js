class APIError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
        this.isOperational = true; // عشان نميز الأخطاء اللي نقدر نتوقعها
        Error.captureStackTrace(this, this.constructor);
    }
}
module.exports = APIError; 