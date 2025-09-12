import { Request, Response, NextFunction } from 'express';
import { AuthService, AuthUser } from './auth';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionToken?: string;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  sessionToken: string;
}

// Authentication middleware for protected routes
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header or session cookie
    const authHeader = req.headers.authorization;
    const sessionToken = req.cookies?.sessionToken || 
                        (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (!sessionToken) {
      return res.status(401).json({ message: 'No authentication token provided' });
    }

    // Validate session
    const user = await AuthService.validateSession(sessionToken);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired session' });
    }

    // Attach user to request
    req.user = user;
    req.sessionToken = sessionToken;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Role-based authorization middleware
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions for this action',
        required: allowedRoles,
        current: req.user.userType
      });
    }

    next();
  };
};

// School admin authorization
export const requireSchoolAdmin = authorize(['school_admin']);

// Teacher authorization (includes school admin)
export const requireTeacher = authorize(['school_admin', 'teacher']);

// Student authorization (includes teachers and school admins)
export const requireStudent = authorize(['school_admin', 'teacher', 'student']);

// Any authenticated user (includes guests)
export const requireAuth = authenticate;

// Optional authentication (adds user if token exists, but doesn't require it)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken = req.cookies?.sessionToken || 
                        (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (sessionToken) {
      const user = await AuthService.validateSession(sessionToken);
      if (user) {
        req.user = user;
        req.sessionToken = sessionToken;
      }
    }
    
    next();
  } catch (error) {
    // Don't fail if optional auth fails, just continue without user
    next();
  }
};

// Validate guest session expiry
export const validateGuestSession = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.userType === 'guest') {
    // Guest session validation is handled in AuthService.validateSession
    // This middleware is just for additional guest-specific checks if needed
  }
  next();
};

// Rate limiting middleware for authentication endpoints
export const authRateLimit = (maxAttempts: number = 5, windowMinutes: number = 15) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    let clientAttempts = attempts.get(clientId);
    
    if (!clientAttempts || now > clientAttempts.resetTime) {
      clientAttempts = { count: 0, resetTime: now + windowMs };
      attempts.set(clientId, clientAttempts);
    }

    if (clientAttempts.count >= maxAttempts) {
      const timeLeft = Math.ceil((clientAttempts.resetTime - now) / 1000 / 60);
      return res.status(429).json({ 
        message: `Too many authentication attempts. Try again in ${timeLeft} minutes.`,
        retryAfter: timeLeft
      });
    }

    clientAttempts.count++;
    next();
  };
};