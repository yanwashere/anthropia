const express = require('express');
const cors = require('cors');
const { router: authRouter } = require('./auth');
const ticketsRouter = require('./tickets');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// API маршруты
app.use('/api/auth', authRouter);
app.use('/api/tickets', ticketsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
