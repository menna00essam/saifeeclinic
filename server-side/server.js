const app = require('./src/app');
const { connectDB } = require('./src/config/database');
const EmailJobs = require("./src/jobs/emailJobs");
require('./src/config/env');

const PORT = process.env.PORT || 5000;

connectDB();
EmailJobs.startAllJobs();
// console.log("Server started with notification jobs running...");
// console.log("EMAIL_USER:", process.env.EMAIL_USER);
// console.log("EMAIL_PASS:", process.env.EMAIL_PASS);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
