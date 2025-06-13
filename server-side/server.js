const app = require("./src/app");
const { connectDB } = require("./src/config/database");
require("./src/config/env");

const errorHandling = require("./src/middleware/errorHandling");

const PORT = process.env.PORT || 5000;

connectDB();

app.use(errorHandling);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
