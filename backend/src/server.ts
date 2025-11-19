// server.ts or app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import routes from './app'; // Fixed import path

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Static files
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/api', routes);

// Replace the 404 handler with this:
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

const PORT = process.env.PORT || 5000;

// Function to run seed script
const runSeedScript = async () => {
  try {
    console.log('🌱 Checking if database needs seeding...');
    
    // Import and run seed script
    const { seedDatabase } = await import('./seed/seedData');
    await seedDatabase();
    
    console.log('✅ Database seeding completed successfully');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    
    // Check if it's a "already seeded" error or a real error
    if (error instanceof Error && error.message.includes('already seeded')) {
      console.log('ℹ️  Database already seeded, continuing...');
    } else {
      console.error('🚨 Serious seeding error, but continuing server startup...');
    }
  }
};

// Start server and run seed script
const startServer = async () => {
  // Only run seed in development or if explicitly enabled
  if (process.env.NODE_ENV === 'development' || process.env.RUN_SEED === 'true') {
    await runSeedScript();
  }

  app.listen(PORT, () => {
    console.log(`🏥 Hospital Management System API running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌱 Auto-seeding: ${process.env.RUN_SEED || 'development only'}`);
  });
};

startServer();

export default app;