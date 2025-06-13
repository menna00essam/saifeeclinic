const responseHandler = {
  success: (res, data = {}, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  },

  error: (res, message = 'Something went wrong', statusCode = 500, error = null) => {
    return res.status(statusCode).json({
      success: false,
      message,
      error: error ? error.toString() : undefined
    });
  }
};

module.exports = { responseHandler };
