const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Patient route works!');
});

module.exports = router;
