const express = require('express');
const bodyParser = require('body-parser');

const boatRouter = require('./api/boat');
const slipRouter = require('./api/slip');

const app = express();
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send("Let's park boats to slips!");
});

app.use('/boats', boatRouter);
app.use('/slips', slipRouter);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});