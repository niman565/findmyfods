import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import * as z from 'zod';
import ProtectedRouter from './routes/protected';
import UnprotectedRouter from './routes/unprotected';
import authMiddleware from './middleware/auth_middleware';

const app: Application = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/', UnprotectedRouter);
app.use('/api/', authMiddleware, ProtectedRouter);

// Test route
app.get('/', (req: Request, res: Response) => {
    res.json({ 
      message: 'Recipe API is running!',
      version: '1.0.0',
      endpoints: {
        recipe: '/api/recipe',
        recipes: '/api/recipes',
        auth: '/api/auth',
        favorites: '/api/favorites',
        logout: '/api/logout'
      }
    });
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: z.prettifyError(err) });
    return;
  }
  if ('code' in err) {
    const code = (err as { code: string }).code;
    if (code === 'P2002') {
      res.status(409).json({ error: 'A record with those details already exists' });
      return;
    }
    if (code === 'P2025') {
      res.status(404).json({ error: 'Record not found' });
      return;
    }
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


