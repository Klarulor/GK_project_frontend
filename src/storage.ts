const TOKEN_KEY = 'jwt_access_token';
const USER_KEY = 'jwt_user';

export type StoredUser = {
  user_id: number;
  username: string;
  role: number;
};

export const authStorage = {
  setToken: (token: string) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },
  clearToken: () => {
    localStorage.removeItem(TOKEN_KEY);
  },
  setUser: (user: StoredUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getUser: (): StoredUser | null => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) as StoredUser : null;
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
