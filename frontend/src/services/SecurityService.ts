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
  _id?: string; // MongoDB ID
  id: string;
  title: string;
  content: string;
  encrypted: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  userId?: string; // Add userId for backend compatibility
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
  private readonly API_BASE_URL = 'http://localhost:5000/api';
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

  private getAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  private async apiCall(endpoint: string, method: string, data?: any): Promise<any> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    };

    const response = await fetch(`${this.API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'API call failed');
    }
    
    // Handle 204 No Content for successful deletions
    if (response.status === 204) {
      return null; 
    }

    return response.json();
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
    // Removed localStorage.getItem('secureNotes') as notes will be fetched from backend
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
  public async createSecureNote(title: string, content: string, tags: string[] = []): Promise<SecureNote> {
    try {
      const encryptedContent = this.encryptData(content, this.deviceKey);
      const newNote = await this.apiCall('/notes', 'POST', {
        title,
        content: encryptedContent,
        encrypted: true,
        tags,
      });
      this.logSecurityEvent('secure_note', 'success', 'Secure note created');
      return newNote;
    } catch (error: any) {
      this.logSecurityEvent('secure_note', 'failure', `Failed to create secure note: ${error.message}`);
      throw error;
    }
  }

  public async updateSecureNote(id: string, title: string, content: string, tags: string[] = []): Promise<SecureNote | null> {
    try {
      const encryptedContent = this.encryptData(content, this.deviceKey);
      const updatedNote = await this.apiCall(`/notes/${id}`, 'PUT', {
        title,
        content: encryptedContent,
        encrypted: true,
        tags,
      });
      this.logSecurityEvent('secure_note', 'success', 'Secure note updated');
      return updatedNote;
    } catch (error: any) {
      this.logSecurityEvent('secure_note', 'failure', `Failed to update secure note: ${error.message}`);
      throw error;
    }
  }

  public async deleteSecureNote(id: string): Promise<boolean> {
    try {
      await this.apiCall(`/notes/${id}`, 'DELETE');
      this.logSecurityEvent('secure_note', 'success', 'Secure note deleted');
      return true;
    } catch (error: any) {
      this.logSecurityEvent('secure_note', 'failure', `Failed to delete secure note: ${error.message}`);
      throw error;
    }
  }

  public async getSecureNotes(): Promise<SecureNote[]> {
    try {
      const notes: SecureNote[] = await this.apiCall('/notes', 'GET');
      // Decrypt content for display
      return notes.map(note => ({
        ...note,
        content: note.encrypted ? (this.decryptData(note.content, this.deviceKey) || '') : note.content,
      }));
    } catch (error: any) {
      this.logSecurityEvent('secure_note', 'failure', `Failed to fetch secure notes: ${error.message}`);
      console.error('Error fetching secure notes:', error);
      return [];
    }
  }

  public async getSecureNote(id: string): Promise<SecureNote | null> {
    try {
      const note: SecureNote = await this.apiCall(`/notes/${id}`, 'GET');
      // Decrypt content for display
      return {
        ...note,
        content: note.encrypted ? (this.decryptData(note.content, this.deviceKey) || '') : note.content,
      };
    } catch (error: any) {
      this.logSecurityEvent('secure_note', 'failure', `Failed to fetch secure note: ${error.message}`);
      console.error('Error fetching single secure note:', error);
      return null;
    }
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

    attempts[userId].count++;
    attempts[userId].lastAttempt = now;
    localStorage.setItem('loginAttempts', JSON.stringify(attempts));

    if (attempts[userId].count >= this.MAX_LOGIN_ATTEMPTS) {
      attempts[userId].lockedUntil = now + this.LOCKOUT_DURATION;
      localStorage.setItem('loginAttempts', JSON.stringify(attempts));
      this.logSecurityEvent('login', 'failure', `User ${userId} locked out due to too many failed attempts`);
      return false;
    }

    return true;
  }

  public isAccountLocked(userId: string): boolean {
    const attempts = this.getLoginAttempts();
    const userAttempts = attempts[userId];
    if (!userAttempts || !userAttempts.lockedUntil) return false;
    return Date.now() < userAttempts.lockedUntil;
  }

  public resetLoginAttempts(userId: string): void {
    const attempts = this.getLoginAttempts();
    if (attempts[userId]) {
      delete attempts[userId];
      localStorage.setItem('loginAttempts', JSON.stringify(attempts));
    }
  }

  public logSecurityEvent(
    type: SecurityLogEntry['type'],
    status: SecurityLogEntry['status'],
    details: string
  ): void {
    const logs: SecurityLogEntry[] = JSON.parse(localStorage.getItem('securityLogs') || '[]');
    const newLog: SecurityLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type,
      status,
      details,
    };
    logs.unshift(newLog);
    localStorage.setItem('securityLogs', JSON.stringify(logs));
  }

  public getSecurityLogs(): SecurityLogEntry[] {
    return JSON.parse(localStorage.getItem('securityLogs') || '[]');
  }

  private getSessions(): Session[] {
    return JSON.parse(localStorage.getItem('sessions') || '[]');
  }

  private getLoginAttempts(): Record<string, { count: number; lastAttempt: number; lockedUntil: number | null }> {
    return JSON.parse(localStorage.getItem('loginAttempts') || '{}');
  }

  private generateSalt(): string {
    return CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex);
  }

  private hashPassword(password: string, salt: string): string {
    return CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 1000 }).toString(CryptoJS.enc.Hex);
  }

  public encryptData(data: any, key: string): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
  }

  public decryptData(encryptedData: string, key: string): any {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, key);
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (e) {
      console.error("Decryption failed:", e);
      return null;
    }
  }
}

export default SecurityService; 