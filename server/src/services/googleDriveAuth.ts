import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../utils/encryption';

const prisma = new PrismaClient();

// Google Drive OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3000/api/v1/files/google-drive/callback';
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

/**
 * Create OAuth2 client for Google Drive
 */
export function createGoogleDriveClient(): OAuth2Client {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Get authorization URL for OAuth2 flow
 */
export async function getAuthorizationUrl(): Promise<string> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google Drive OAuth credentials not configured. Please set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET');
  }

  const oauth2Client = createGoogleDriveClient();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    prompt: 'consent', // Force consent screen to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<any> {
  const oauth2Client = createGoogleDriveClient();
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw new Error('Failed to exchange authorization code for tokens');
  }
}

/**
 * Store tokens in database (encrypted)
 */
export async function storeTokens(tokens: any, email?: string): Promise<string> {
  try {
    // Ensure required tokens are present
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing required tokens in token set');
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    // Calculate expiration time
    const expiresIn = tokens.expiry_date 
      ? tokens.expiry_date 
      : Date.now() + (tokens.expires_in || 3600) * 1000;
    const expiresAt = new Date(expiresIn);

    // Create or update connection
    const connection = await prisma.googleDriveConnection.upsert({
      where: { 
        // Use email as unique identifier if available, otherwise create new
        id: email ? undefined : 'new',
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        tokenType: tokens.token_type || 'Bearer',
        scopes: tokens.scope?.split(' ') || GOOGLE_SCOPES,
        email: email || undefined,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        tokenType: tokens.token_type || 'Bearer',
        scopes: tokens.scope?.split(' ') || GOOGLE_SCOPES,
        email: email || undefined,
        isActive: true,
      },
    });

    return connection.id;
  } catch (error) {
    console.error('Error storing tokens:', error);
    throw new Error('Failed to store Google Drive tokens');
  }
}

/**
 * Get active Google Drive connection
 */
export async function getActiveConnection() {
  const connection = await prisma.googleDriveConnection.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!connection) {
    return null;
  }

  return connection;
}

/**
 * Get decrypted tokens for a connection
 */
export function getDecryptedTokens(connection: any): any {
  return {
    access_token: decrypt(connection.accessToken),
    refresh_token: decrypt(connection.refreshToken),
    token_type: connection.tokenType,
    expiry_date: connection.expiresAt.getTime(),
  };
}

/**
 * Check if tokens need refresh (within 5 minutes of expiry)
 */
export function needsRefresh(connection: any): boolean {
  const expiresAt = new Date(connection.expiresAt);
  const now = new Date();
  const fiveMinutes = 5 * 60 * 1000;
  
  return (expiresAt.getTime() - now.getTime()) < fiveMinutes;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(connectionId: string): Promise<any> {
  const connection = await prisma.googleDriveConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new Error('Google Drive connection not found');
  }

  const oauth2Client = createGoogleDriveClient();
  const currentTokens = getDecryptedTokens(connection);

  try {
    // Set current tokens
    oauth2Client.setCredentials(currentTokens);

    // Refresh tokens
    const { credentials } = await oauth2Client.refreshAccessToken();

    // Ensure required tokens are present
    if (!credentials.access_token || !credentials.refresh_token) {
      throw new Error('Missing required tokens after refresh');
    }

    // Store new tokens
    const encryptedAccessToken = encrypt(credentials.access_token);
    const encryptedRefreshToken = encrypt(credentials.refresh_token);
    const expiresAt = new Date(credentials.expiry_date || Date.now() + 3600 * 1000);

    await prisma.googleDriveConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        updatedAt: new Date(),
      },
    });

    return credentials;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw new Error('Failed to refresh Google Drive access token');
  }
}

/**
 * Get authenticated Google Drive client with automatic token refresh
 */
export async function getAuthenticatedDriveClient(): Promise<{ drive: any; connectionId: string } | null> {
  const connection = await getActiveConnection();

  if (!connection) {
    console.warn('No active Google Drive connection found');
    return null;
  }

  // Refresh token if needed
  let tokens: any;
  if (needsRefresh(connection)) {
    console.log('Refreshing Google Drive access token...');
    tokens = await refreshAccessToken(connection.id);
  } else {
    tokens = getDecryptedTokens(connection);
  }

  // Create and configure client
  const oauth2Client = createGoogleDriveClient();
  oauth2Client.setCredentials(tokens);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  return {
    drive,
    connectionId: connection.id,
  };
}

/**
 * Get user email from tokens
 */
export async function getUserEmail(tokens: any): Promise<string | null> {
  try {
    const oauth2Client = createGoogleDriveClient();
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    
    return data.email || null;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
}

/**
 * Disconnect Google Drive integration
 */
export async function disconnectGoogleDrive(connectionId: string): Promise<void> {
  await prisma.googleDriveConnection.update({
    where: { id: connectionId },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });
}

/**
 * Test connection to Google Drive API
 */
export async function testConnection(): Promise<{ success: boolean; message: string; email?: string }> {
  try {
    const client = await getAuthenticatedDriveClient();
    
    if (!client) {
      return {
        success: false,
        message: 'No active Google Drive connection found',
      };
    }

    // Try to fetch about info to verify access
    const response = await client.drive.about.get({
      fields: 'user(emailAddress,displayName)',
    });
    
    if (response.data && response.data.user) {
      return {
        success: true,
        message: 'Successfully connected to Google Drive',
        email: response.data.user.emailAddress || undefined,
      };
    }

    return {
      success: false,
      message: 'Connected to Google Drive but could not retrieve user info',
    };
  } catch (error) {
    console.error('Google Drive connection test failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed',
    };
  }
}
