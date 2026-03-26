import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req: Request, res: Response) => {
    res.json({ 
      message: 'Recipe API is running!',
      version: '1.0.0',
      endpoints: {
        recipes: '/api/recipes',
        auth: '/api/auth',
        favorites: '/api/favorites'
      }
    });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
