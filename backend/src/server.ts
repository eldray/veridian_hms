import dotenv from 'dotenv'
import app from './app';
import connectDB from './config/db';
import seedData from './seed/seedData';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await seedData(); // Seed data from JSON files

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};
// src/server.ts - at the top
if (process.env.NODE_ENV === 'development') {
  // Clear mongoose cache on hot reload
  Object.keys(mongoose.connection.models).forEach(key => {
    delete mongoose.connection.models[key];
  });
}

startServer();
