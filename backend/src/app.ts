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

// The one browser origin allowed to call the API with the login cookie.
// Browsers send the origin without a trailing slash, so one typed into the
// setting is removed; otherwise the frontend would be silently refused.
const clientOrigin = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '');

// Middleware
// `credentials: true` lets the browser send the auth cookie. Browsers refuse
// that for a wildcard origin, so the allowed origin is listed explicitly.
// Requests from any other origin get no CORS headers.
app.use(cors({ origin: [clientOrigin], credentials: true }));
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
        tags: '/api/tags',
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
