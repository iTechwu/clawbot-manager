'use server';
import request from '@/lib/requests';
import type { TikTokAccessToken } from '@repo/types/auth';

export async function getOAuthUrl(provider: string) {
  const now = new Date().getTime();
  switch (provider) {
    case 'tiktok':
      return `${process.env.TIKTOK_ENDPOINT_OAUTH}?client_key=${process.env.TIKTOK_CLIENT_KEY}&response_type=code&scope=${process.env.TIKTOK_AUTH_SCOPES}&redirect_uri=${process.env.TIKTOK_REDIRECT_URI}&state=${now}`;
    case 'instagram':
    default:
      return;
  }
}

// Fetch an access token using an authorization code
export async function getTiktokAccessToken(code: string) {
  const resp = await request.post<TikTokAccessToken>(
    `${process.env.TIKTOK_API_ENDPOINT}/v2/oauth/token/`,
    {
      params: {
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TIKTOK_REDIRECT_URI,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
  return resp;
}

// Refresh an access token using a refresh token
export async function refreshTiktokAccessToken(refreshToken: string) {
  const fields = '';
  const resp = await request.post<TikTokAccessToken>(
    `${process.env.TIKTOK_API_ENDPOINT}/v2/oauth/token/?fields=${fields}`,
    {
      params: {
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
  return resp;
}

// Get User Info
export async function getTiktokUserProfile(accessToken: string) {
  const resp = await request.get(
    `${process.env.TIKTOK_API_ENDPOINT}/v2/user/info/`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return resp;
}

/**
 * 
 {
    "access_token": "act.8dsjbPDiBVQzq34dd1X2U47e6r6BsvP7eTBrwYa3O91XMFPpIeTq1pYYt2Ik!5096.va",
    "expires_in": 86400,
    "open_id": "-000u1leqP_Rg0TBecSi3DSYFpc5qQFO0aOV",
    "refresh_expires_in": 31536000,
    "refresh_token": "rft.z4K63WtDO7SFLl4jaI3yn4sUYSlTNTAS4NiYnLRt3iwLBOIH37UUZmamqgNM!5132.va",
    "scope": "user.info.basic,video.publish,video.upload",
    "token_type": "Bearer"
}
 * 
 */
