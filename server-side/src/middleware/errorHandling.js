function errorHandling(err, req, res, next) {
    if (err.cause?.cose == 11000) {
        return res.status(400).json({ error: err.message })
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: `Mongoose validation error: ${err.message}` })
    }

    if (err.name === 'CastError' && err.kid === 'ObjectId') {
        return res.status(400).json({ error: "Invalid reference ID, Please provide a correct objectId" })
    }

    res.status(err.statusCode || 500).json({ error: err.message || "Internal server error" });
}

module.exports = errorHandling;