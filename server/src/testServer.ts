import express from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database.js';
import authRoutes from './routes/auth.js';

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Test server running' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

async function startTestServer() {
  try {
    console.log('🔗 Connecting to database...');
    await connectDatabase();
    console.log('✅ Database connected');

    const PORT = 3002;
    app.listen(PORT, () => {
      console.log(`🚀 Test server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startTestServer();