import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto-js';
import { db } from './db';
import { users, userSessions, schools, classes } from '../shared/schema';
import { eq, and, gt } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
const SALT_ROUNDS = 12;

export interface AuthUser {
  id: string;
  username?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  userType: string;
  schoolId?: string | null;
  classId?: string | null;
  grade?: string | null;
  isActive: boolean | null;
}

export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
  userType: string;
}

export interface RegisterData {
  email?: string;
  username?: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: 'school_admin' | 'teacher' | 'student';
  schoolId?: string;
  classId?: string;
  grade?: string;
  schoolCode?: string;
}

export interface GuestData {
  firstName: string;
  lastName?: string;
  sessionDuration?: number; // minutes, default 60
}

export class AuthService {
  // Hash password for storage
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  // Verify password against hash
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  // Generate session token
  static generateSessionToken(): string {
    return crypto.lib.WordArray.random(32).toString();
  }

  // Generate JWT token
  static generateJWT(user: AuthUser): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        userType: user.userType,
        schoolId: user.schoolId,
      },
      JWT_SECRET as string,
      { expiresIn: '7d' }
    );
  }

  // Verify JWT token
  static verifyJWT(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET as string);
    } catch (error) {
      return null;
    }
  }

  // Create guest user
  static async createGuestUser(guestData: GuestData): Promise<AuthUser> {
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const sessionDuration = guestData.sessionDuration || 60; // Default 60 minutes
    const expiryTime = new Date(Date.now() + sessionDuration * 60 * 1000);

    const [newUser] = await db.insert(users).values({
      id: guestId,
      firstName: guestData.firstName,
      lastName: guestData.lastName || '',
      userType: 'guest',
      guestSessionExpiry: expiryTime,
      isActive: true,
    }).returning();

    return {
      id: newUser.id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      userType: newUser.userType,
      isActive: newUser.isActive,
    };
  }

  // Register new user (school admin, teacher, student)
  static async registerUser(registerData: RegisterData): Promise<AuthUser> {
    // Check if user already exists
    let existingUser = null;
    if (registerData.email) {
      existingUser = await db.select().from(users).where(eq(users.email, registerData.email)).limit(1);
    }
    if (registerData.username && !existingUser?.length) {
      existingUser = await db.select().from(users).where(eq(users.username, registerData.username)).limit(1);
    }

    if (existingUser?.length) {
      throw new Error('User already exists with this email or username');
    }

    // Hash password
    const passwordHash = await this.hashPassword(registerData.password);

    // Generate user ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Validate school code for students/teachers
    if (registerData.userType !== 'school_admin' && registerData.schoolCode) {
      const school = await db.select().from(schools).where(eq(schools.id, registerData.schoolCode)).limit(1);
      if (!school.length) {
        throw new Error('Invalid school code');
      }
      registerData.schoolId = school[0].id;
    }

    const [newUser] = await db.insert(users).values({
      id: userId,
      username: registerData.username,
      email: registerData.email,
      passwordHash,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      userType: registerData.userType,
      schoolId: registerData.schoolId,
      classId: registerData.classId,
      grade: registerData.grade,
      isActive: true,
      emailVerified: false,
    }).returning();

    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      userType: newUser.userType,
      schoolId: newUser.schoolId,
      classId: newUser.classId,
      grade: newUser.grade,
      isActive: newUser.isActive,
    };
  }

  // Login user with credentials
  static async loginUser(credentials: LoginCredentials): Promise<{ user: AuthUser; token: string; sessionToken: string }> {
    // Find user by email or username
    let user = null;
    if (credentials.email) {
      const users_found = await db.select().from(users).where(eq(users.email, credentials.email)).limit(1);
      user = users_found[0];
    } else if (credentials.username) {
      const users_found = await db.select().from(users).where(eq(users.username, credentials.username)).limit(1);
      user = users_found[0];
    }

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    if (!user.passwordHash || !(await this.verifyPassword(credentials.password, user.passwordHash))) {
      throw new Error('Invalid password');
    }

    // Verify user type matches
    if (user.userType !== credentials.userType) {
      throw new Error('Invalid user type for this login method');
    }

    // Update last login
    await db.update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    // Create session
    const sessionToken = this.generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(userSessions).values({
      id: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId: user.id,
      sessionToken,
      expiresAt,
      isActive: true,
    });

    // Generate JWT
    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
      schoolId: user.schoolId,
      classId: user.classId,
      grade: user.grade,
      isActive: user.isActive,
    };

    const jwtToken = this.generateJWT(authUser);

    return {
      user: authUser,
      token: jwtToken,
      sessionToken,
    };
  }

  // Validate session token
  static async validateSession(sessionToken: string): Promise<AuthUser | null> {
    const session = await db.select({
      user: users,
      session: userSessions,
    })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(
        and(
          eq(userSessions.sessionToken, sessionToken),
          eq(userSessions.isActive, true),
          gt(userSessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!session.length) {
      return null;
    }

    const { user } = session[0];

    // Check if guest session has expired
    if (user.userType === 'guest' && user.guestSessionExpiry && user.guestSessionExpiry < new Date()) {
      await this.logoutUser(sessionToken);
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
      schoolId: user.schoolId,
      classId: user.classId,
      grade: user.grade,
      isActive: user.isActive,
    };
  }

  // Logout user (invalidate session)
  static async logoutUser(sessionToken: string): Promise<void> {
    await db.update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.sessionToken, sessionToken));
  }

  // Get user by ID
  static async getUserById(userId: string): Promise<AuthUser | null> {
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!userResult.length) {
      return null;
    }

    const user = userResult[0];
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
      schoolId: user.schoolId,
      classId: user.classId,
      grade: user.grade,
      isActive: user.isActive,
    };
  }

  // Create school
  static async createSchool(schoolData: {
    name: string;
    domain?: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
    adminUserId: string;
  }): Promise<any> {
    const schoolId = `school_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const [newSchool] = await db.insert(schools).values({
      id: schoolId,
      name: schoolData.name,
      domain: schoolData.domain,
      address: schoolData.address,
      contactEmail: schoolData.contactEmail,
      contactPhone: schoolData.contactPhone,
      adminUserId: schoolData.adminUserId,
      isActive: true,
    }).returning();

    return newSchool;
  }

  // Create class
  static async createClass(classData: {
    name: string;
    schoolId: string;
    teacherId?: string;
    grade?: string;
    subject?: string;
    description?: string;
  }): Promise<any> {
    const classId = `class_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const [newClass] = await db.insert(classes).values({
      id: classId,
      name: classData.name,
      schoolId: classData.schoolId,
      teacherId: classData.teacherId,
      grade: classData.grade,
      subject: classData.subject,
      description: classData.description,
      isActive: true,
    }).returning();

    return newClass;
  }
}