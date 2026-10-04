import express from 'express';
import cors from 'cors';
import paymentRoutes from './routes/payment.route';
import connectDB from './config/db';
import dotenv from 'dotenv';

dotenv.config();

// Connect to Database
connectDB();


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/payment', paymentRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Backend Server is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
