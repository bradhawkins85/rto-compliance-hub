import { XeroClient, TokenSet } from 'xero-node';
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../utils/encryption';

const prisma = new PrismaClient();

// Xero OAuth configuration
const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID || '';
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET || '';
const XERO_REDIRECT_URI = process.env.XERO_REDIRECT_URI || 'http://localhost:3000/api/v1/sync/xero/callback';
const XERO_SCOPES = 'openid profile email accounting.transactions accounting.settings payroll.employees payroll.payruns offline_access';

/**
 * Initialize Xero client
 */
export function createXeroClient(): XeroClient {
  return new XeroClient({
    clientId: XERO_CLIENT_ID,
    clientSecret: XERO_CLIENT_SECRET,
    redirectUris: [XERO_REDIRECT_URI],
    scopes: XERO_SCOPES.split(' '),
  });
}

/**
 * Get authorization URL for OAuth2 flow
 */
export function getAuthorizationUrl(): string {
  if (!XERO_CLIENT_ID || !XERO_CLIENT_SECRET) {
    throw new Error('Xero OAuth credentials not configured. Please set XERO_CLIENT_ID and XERO_CLIENT_SECRET');
  }

  const xero = createXeroClient();
  return xero.buildConsentUrl();
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<TokenSet> {
  const xero = createXeroClient();
  
  try {
    const tokenSet = await xero.apiCallback(XERO_REDIRECT_URI + `?code=${code}`);
    return tokenSet;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw new Error('Failed to exchange authorization code for tokens');
  }
}

/**
 * Store tokens in database (encrypted)
 */
export async function storeTokens(
  tokenSet: TokenSet,
  tenantId: string,
  tenantName?: string
): Promise<string> {
  try {
    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokenSet.access_token);
    const encryptedRefreshToken = encrypt(tokenSet.refresh_token!);

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (tokenSet.expires_in! * 1000));

    // Upsert connection
    const connection = await prisma.xeroConnection.upsert({
      where: { tenantId },
      update: {
        tenantName,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        tokenType: tokenSet.token_type || 'Bearer',
        scopes: tokenSet.scope?.split(' ') || [],
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        tenantId,
        tenantName,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        tokenType: tokenSet.token_type || 'Bearer',
        scopes: tokenSet.scope?.split(' ') || [],
        isActive: true,
      },
    });

    return connection.id;
  } catch (error) {
    console.error('Error storing tokens:', error);
    throw new Error('Failed to store Xero tokens');
  }
}

/**
 * Get active Xero connection
 */
export async function getActiveConnection() {
  const connection = await prisma.xeroConnection.findFirst({
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
export function getDecryptedTokens(connection: any): TokenSet {
  return {
    access_token: decrypt(connection.accessToken),
    refresh_token: decrypt(connection.refreshToken),
    token_type: connection.tokenType,
    expires_in: Math.floor((connection.expiresAt.getTime() - Date.now()) / 1000),
    scope: connection.scopes.join(' '),
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
export async function refreshAccessToken(connectionId: string): Promise<TokenSet> {
  const connection = await prisma.xeroConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new Error('Xero connection not found');
  }

  const xero = createXeroClient();
  const currentTokens = getDecryptedTokens(connection);

  try {
    // Set current token set
    xero.setTokenSet(currentTokens);

    // Refresh tokens
    const newTokenSet = await xero.refreshToken();

    // Store new tokens
    const encryptedAccessToken = encrypt(newTokenSet.access_token);
    const encryptedRefreshToken = encrypt(newTokenSet.refresh_token!);
    const expiresAt = new Date(Date.now() + (newTokenSet.expires_in! * 1000));

    await prisma.xeroConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        updatedAt: new Date(),
      },
    });

    return newTokenSet;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw new Error('Failed to refresh Xero access token');
  }
}

/**
 * Get authenticated Xero client with automatic token refresh
 */
export async function getAuthenticatedXeroClient(): Promise<{ xero: XeroClient; tenantId: string } | null> {
  const connection = await getActiveConnection();

  if (!connection) {
    console.warn('No active Xero connection found');
    return null;
  }

  // Refresh token if needed
  let tokenSet: TokenSet;
  if (needsRefresh(connection)) {
    console.log('Refreshing Xero access token...');
    tokenSet = await refreshAccessToken(connection.id);
  } else {
    tokenSet = getDecryptedTokens(connection);
  }

  // Create and configure client
  const xero = createXeroClient();
  await xero.setTokenSet(tokenSet);

  return {
    xero,
    tenantId: connection.tenantId,
  };
}

/**
 * Disconnect Xero integration
 */
export async function disconnectXero(connectionId: string): Promise<void> {
  await prisma.xeroConnection.update({
    where: { id: connectionId },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });
}

/**
 * Test connection to Xero API
 */
export async function testConnection(): Promise<{ success: boolean; message: string; tenantName?: string }> {
  try {
    const client = await getAuthenticatedXeroClient();
    
    if (!client) {
      return {
        success: false,
        message: 'No active Xero connection found',
      };
    }

    // Try to fetch tenant connections to verify access
    const tenants = await client.xero.updateTenants();
    
    if (tenants && tenants.length > 0) {
      return {
        success: true,
        message: 'Successfully connected to Xero',
        tenantName: tenants[0].tenantName,
      };
    }

    return {
      success: false,
      message: 'Connected to Xero but no tenants found',
    };
  } catch (error) {
    console.error('Xero connection test failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed',
    };
  }
}
