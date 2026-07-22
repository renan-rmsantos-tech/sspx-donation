import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  isAdmin: boolean;
  username?: string;
}

export const getSession = async () => {
  const password = process.env.SESSION_PASSWORD;
  if (!password || password.length < 32) {
    throw new Error(
      'SESSION_PASSWORD não configurado ou muito curto (mínimo 32 caracteres).'
    );
  }

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, {
    password,
    cookieName: 'auth-session',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  });

  return session;
};

export const validateSession = async (): Promise<boolean> => {
  try {
    const session = await getSession();
    return session.isAdmin === true;
  } catch {
    return false;
  }
};
