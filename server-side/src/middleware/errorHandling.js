// src/middlewares/errorHandling.js
function errorHandling(err, req, res, next) {

  if (err.cause?.code === 11000) {
    return res
      .status(400)
      .json({
        error: `Duplicate field value: ${
          Object.keys(err.keyValue)[0]
        } already exists.`,
      });
  } 

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data: ${errors.join(". ")}`;
    return res.status(400).json({ error: message });
  } 

  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res
      .status(400)
      .json({ error: "Invalid ID format, please provide a correct objectId." });
  }

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
        : undefined, 
    });
  } 

  res.status(err.statusCode || 500).json({
    status: err.status || "error",
    message: err.message || "Internal server error",
  });
}

module.exports = errorHandling;
