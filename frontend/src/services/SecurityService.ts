import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import * as OTPAuth from 'otpauth';

interface SecurityLogEntry {
  id: string;
  timestamp: string;
  type: 'login' | 'logout' | '2fa' | 'password_change' | 'security_settings' | 'secure_note';
  status: 'success' | 'failure';
  details: string;
  ip?: string;
}

interface SecureNote {
  id: string;
  title: string;
  content: string;
  encrypted: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

interface Session {
  id: string;
  userId: string;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
  isActive: boolean;
}

class SecurityService {
  private static instance: SecurityService;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private deviceKey: string = '';

  private constructor() {
    this.initializeSecurityLogs();
    this.initializeDeviceKey();
  }

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  private initializeSecurityLogs(): void {
    if (!localStorage.getItem('securityLogs')) {
      localStorage.setItem('securityLogs', JSON.stringify([]));
    }
    if (!localStorage.getItem('sessions')) {
      localStorage.setItem('sessions', JSON.stringify([]));
    }
    if (!localStorage.getItem('loginAttempts')) {
      localStorage.setItem('loginAttempts', JSON.stringify({}));
    }
    if (!localStorage.getItem('secureNotes')) {
      localStorage.setItem('secureNotes', JSON.stringify([]));
    }
  }

  private initializeDeviceKey(): void {
    let deviceKey = localStorage.getItem('deviceKey');
    if (!deviceKey) {
      deviceKey = CryptoJS.lib.WordArray.random(32).toString();
      localStorage.setItem('deviceKey', deviceKey);
    }
    this.deviceKey = deviceKey;
  }

  // Secure Notes
  public createSecureNote(title: string, content: string, tags: string[] = []): SecureNote {
    const note: SecureNote = {
      id: uuidv4(),
      title,
      content: this.encryptData(content, this.deviceKey),
      encrypted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags
    };

    const notes = this.getSecureNotes();
    notes.push(note);
    localStorage.setItem('secureNotes', JSON.stringify(notes));
    
    this.logSecurityEvent('secure_note', 'success', 'Secure note created');
    return note;
  }

  public updateSecureNote(id: string, title: string, content: string, tags: string[] = []): SecureNote | null {
    const notes = this.getSecureNotes();
    const noteIndex = notes.findIndex(note => note.id === id);
    
    if (noteIndex === -1) return null;

    const updatedNote: SecureNote = {
      ...notes[noteIndex],
      title,
      content: this.encryptData(content, this.deviceKey),
      tags,
      updatedAt: new Date().toISOString()
    };

    notes[noteIndex] = updatedNote;
    localStorage.setItem('secureNotes', JSON.stringify(notes));
    
    this.logSecurityEvent('secure_note', 'success', 'Secure note updated');
    return updatedNote;
  }

  public deleteSecureNote(id: string): boolean {
    const notes = this.getSecureNotes();
    const filteredNotes = notes.filter(note => note.id !== id);
    
    if (filteredNotes.length === notes.length) return false;
    
    localStorage.setItem('secureNotes', JSON.stringify(filteredNotes));
    this.logSecurityEvent('secure_note', 'success', 'Secure note deleted');
    return true;
  }

  public getSecureNotes(): SecureNote[] {
    return JSON.parse(localStorage.getItem('secureNotes') || '[]');
  }

  public getSecureNote(id: string): SecureNote | null {
    const notes = this.getSecureNotes();
    const note = notes.find(note => note.id === id);
    if (!note) return null;

    return {
      ...note,
      content: this.decryptData(note.content, this.deviceKey) || ''
    };
  }

  // Master Password Management
  public async setMasterPassword(password: string): Promise<void> {
    const salt = this.generateSalt();
    const hashedPassword = this.hashPassword(password, salt);
    localStorage.setItem('masterPassword', JSON.stringify({ hash: hashedPassword, salt }));
    this.logSecurityEvent('password_change', 'success', 'Master password set');
  }

  public async verifyMasterPassword(password: string): Promise<boolean> {
    const stored = JSON.parse(localStorage.getItem('masterPassword') || '{}');
    if (!stored.hash || !stored.salt) return false;
    
    const hashedPassword = this.hashPassword(password, stored.salt);
    const isValid = hashedPassword === stored.hash;
    
    this.logSecurityEvent('login', isValid ? 'success' : 'failure', 'Master password verification');
    return isValid;
  }

  // 2FA Management
  public generate2FASecret(): string {
    const secret = new OTPAuth.Secret();
    const totp = new OTPAuth.TOTP({
      issuer: "NHCE",
      label: "User",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secret
    });
    
    localStorage.setItem('2faSecret', totp.secret.base32);
    this.logSecurityEvent('2fa', 'success', '2FA secret generated');
    return totp.secret.base32;
  }

  public verify2FAToken(token: string): boolean {
    const secret = localStorage.getItem('2faSecret');
    if (!secret) return false;

    const totp = new OTPAuth.TOTP({
      issuer: "NHCE",
      label: "User",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secret
    });

    const isValid = totp.validate({ token, window: 1 }) !== null;
    this.logSecurityEvent('2fa', isValid ? 'success' : 'failure', '2FA verification');
    return isValid;
  }

  // Session Management
  public createSession(userId: string): Session {
    const session: Session = {
      id: uuidv4(),
      userId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.SESSION_TIMEOUT).toISOString(),
      isActive: true
    };

    const sessions = this.getSessions();
    sessions.push(session);
    localStorage.setItem('sessions', JSON.stringify(sessions));
    
    this.logSecurityEvent('login', 'success', 'Session created');
    return session;
  }

  public validateSession(sessionId: string): boolean {
    const sessions = this.getSessions();
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session || !session.isActive) return false;
    
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    
    if (now > expiresAt) {
      this.invalidateSession(sessionId);
      return false;
    }
    
    // Update last activity
    session.lastActivity = now.toISOString();
    session.expiresAt = new Date(now.getTime() + this.SESSION_TIMEOUT).toISOString();
    localStorage.setItem('sessions', JSON.stringify(sessions));
    
    return true;
  }

  public invalidateSession(sessionId: string): void {
    const sessions = this.getSessions();
    const updatedSessions = sessions.map(session => 
      session.id === sessionId ? { ...session, isActive: false } : session
    );
    localStorage.setItem('sessions', JSON.stringify(updatedSessions));
    this.logSecurityEvent('logout', 'success', 'Session invalidated');
  }

  // Login Attempt Tracking
  public trackLoginAttempt(userId: string): boolean {
    const attempts = this.getLoginAttempts();
    const now = Date.now();
    
    if (!attempts[userId]) {
      attempts[userId] = { count: 0, lastAttempt: now, lockedUntil: null };
    }
    
    const userAttempts = attempts[userId];
    
    // Check if user is locked out
    if (userAttempts.lockedUntil && now < userAttempts.lockedUntil) {
      return false;
    }
    
    // Reset lockout if lockout period has passed
    if (userAttempts.lockedUntil && now >= userAttempts.lockedUntil) {
      userAttempts.count = 0;
      userAttempts.lockedUntil = null;
    }
    
    userAttempts.count++;
    userAttempts.lastAttempt = now;
    
    // Lock user if max attempts reached
    if (userAttempts.count >= this.MAX_LOGIN_ATTEMPTS) {
      userAttempts.lockedUntil = now + this.LOCKOUT_DURATION;
    }
    
    localStorage.setItem('loginAttempts', JSON.stringify(attempts));
    return !userAttempts.lockedUntil;
  }

  public resetLoginAttempts(userId: string): void {
    const attempts = this.getLoginAttempts();
    delete attempts[userId];
    localStorage.setItem('loginAttempts', JSON.stringify(attempts));
  }

  // Security Logging
  public logSecurityEvent(
    type: SecurityLogEntry['type'],
    status: SecurityLogEntry['status'],
    details: string
  ): void {
    const logs = this.getSecurityLogs();
    const log: SecurityLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type,
      status,
      details,
      ip: 'local' // In a real app, this would be the actual IP
    };
    
    logs.unshift(log);
    // Keep only last 1000 logs
    if (logs.length > 1000) {
      logs.pop();
    }
    
    localStorage.setItem('securityLogs', JSON.stringify(logs));
  }

  public getSecurityLogs(): SecurityLogEntry[] {
    return JSON.parse(localStorage.getItem('securityLogs') || '[]');
  }

  // Helper Methods
  private getSessions(): Session[] {
    return JSON.parse(localStorage.getItem('sessions') || '[]');
  }

  private getLoginAttempts(): Record<string, { count: number; lastAttempt: number; lockedUntil: number | null }> {
    return JSON.parse(localStorage.getItem('loginAttempts') || '{}');
  }

  private generateSalt(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private hashPassword(password: string, salt: string): string {
    return CryptoJS.SHA256(password + salt).toString();
  }

  // Encryption/Decryption
  public encryptData(data: any, key: string): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
  }

  public decryptData(encryptedData: string, key: string): any {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, key);
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (error) {
      return null;
    }
  }
}

export default SecurityService; 