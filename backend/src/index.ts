import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import * as z from 'zod';

import loginRouter from './routes/login';
import registerRouter from './routes/register';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', loginRouter);
app.use('/api/auth', registerRouter);

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: z.prettifyError(err)});
    return;
  }
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

