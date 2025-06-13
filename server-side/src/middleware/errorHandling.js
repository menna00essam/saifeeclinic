// src/middlewares/errorHandling.js
function errorHandling(err, req, res, next) {
  // Duplicate key error from MongoDB (e.g., trying to register with existing email/phone)
  if (err.cause?.code === 11000) {
    // Changed 'cose' to 'code' for typical MongoDB error codes
    return res
      .status(400)
      .json({
        error: `Duplicate field value: ${
          Object.keys(err.keyValue)[0]
        } already exists.`,
      });
  } // Mongoose validation error (e.g., missing required field in Mongoose schema)

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data: ${errors.join(". ")}`;
    return res.status(400).json({ error: message });
  } // Mongoose CastError for invalid ObjectId (e.g., invalid ID format in URL params)

  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res
      .status(400)
      .json({ error: "Invalid ID format, please provide a correct objectId." });
  }

  // Joi validation errors (from validationMW) or custom APIError/AppError
  // APIError has statusCode, AppError has statusCode
  if (
    err.isJoi ||
    (err.statusCode && (err.status === "fail" || err.status === "error"))
  ) {
    return res.status(err.statusCode || 400).json({
      status: err.status || "fail",
      message: err.message,
      errors: err.details
        ? err.details.map((d) => ({
            field: d.path.join("."),
            message: d.message,
          }))
        : undefined, // For Joi errors
    });
  } // Default error handling for any other unexpected errors

  res.status(err.statusCode || 500).json({
    status: err.status || "error",
    message: err.message || "Internal server error",
  });
}

module.exports = errorHandling;
