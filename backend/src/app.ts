import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import * as z from 'zod';
import ProtectedRouter from './routes/protected';
import UnprotectedRouter from './routes/unprotected';

// The app is built here and started in index.ts, so tests can import it
// without opening a port. Environment variables are loaded by index.ts
// (dotenv) or by the test config, never here.
const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api', UnprotectedRouter);
app.use('/api', ProtectedRouter);

// Any other /api path
app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
});

// Test route
app.get('/', (req: Request, res: Response) => {
    res.json({ 
      message: 'Recipe API is running!',
      version: '1.0.0',
      endpoints: {
        recipes: '/api/recipes',
        recipe: '/api/recipe/:id',
        register: '/api/auth/register',
        login: '/api/auth/login',
        logout: '/api/auth/logout',
        me: '/api/auth/me',
        favorites: '/api/favorites'
      }
    });
});

// express.json() reports a request body that is not valid JSON with this type.
function isMalformedJsonError(err: Error): boolean {
  return 'type' in err && err.type === 'entity.parse.failed';
}

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: z.prettifyError(err) });
    return;
  }
  if (isMalformedJsonError(err)) {
    res.status(400).json({ error: 'Request body is not valid JSON' });
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

export default app;
