declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        phone_hash: string | null;
        username?: string | null;
        role: string;
        is_banned: boolean;
        is_active: boolean;
      };
    }
  }
}

export {};
