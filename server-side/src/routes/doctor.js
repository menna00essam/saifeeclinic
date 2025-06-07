const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Doctor route works!');
});

module.exports = router;
