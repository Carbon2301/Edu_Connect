import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { translations, Language } from '../i18n';
import { translateBackendMessage } from '../utils/backendMessageMapper';

const API_URL = 'http://localhost:5000/api';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'Admin' | 'Teacher' | 'Student';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<User>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tạo unique key cho mỗi tab
  const getTabId = () => {
    let tabId = sessionStorage.getItem('tabId');
    if (!tabId) {
      tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('tabId', tabId);
    }
    return tabId;
  };

  useEffect(() => {
    const tabId = getTabId();
    const tokenKey = `token_${tabId}`;
    const userKey = `user_${tabId}`;
    
    // Kiểm tra token trong sessionStorage với key riêng cho tab này
    // Nếu không có, kiểm tra localStorage (để tương thích với dữ liệu cũ)
    const savedToken = sessionStorage.getItem(tokenKey) || localStorage.getItem('token');
    const savedUser = sessionStorage.getItem(userKey) || localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      } catch (error) {
        console.error('Error parsing saved user:', error);
        sessionStorage.removeItem(tokenKey);
        sessionStorage.removeItem(userKey);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean): Promise<User> => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
        rememberMe,
      });

      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      
      const tabId = getTabId();
      const tokenKey = `token_${tabId}`;
      const userKey = `user_${tabId}`;
      
      // Lưu token vào sessionStorage với key riêng cho tab này (mỗi tab có session riêng)
      sessionStorage.setItem(tokenKey, newToken);
      sessionStorage.setItem(userKey, JSON.stringify(userData));
      
      // Nếu tick "Ghi nhớ", cũng lưu vào localStorage để giữ khi đóng trình duyệt
      if (rememberMe) {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        // Xóa token cũ trong localStorage nếu không tick "Ghi nhớ"
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      
      // Set default header cho axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      // Return user data để component có thể sử dụng
      return userData;
    } catch (error: any) {
      // Throw error với message từ backend hoặc generic error
      // Lấy language từ localStorage hoặc dùng 'vi' làm mặc định
      const savedLanguage = (localStorage.getItem('language') || sessionStorage.getItem('language') || 'vi') as Language;
      const backendMessage = error.response?.data?.message || error.message || translations[savedLanguage].loginError || 'Đăng nhập thất bại';
      const errorMessage = translateBackendMessage(backendMessage, savedLanguage);
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    
    const tabId = getTabId();
    const tokenKey = `token_${tabId}`;
    const userKey = `user_${tabId}`;
    
    sessionStorage.removeItem(tokenKey);
    sessionStorage.removeItem(userKey);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      
      const tabId = getTabId();
      const userKey = `user_${tabId}`;
      
      // Cập nhật user trong sessionStorage
      sessionStorage.setItem(userKey, JSON.stringify(updatedUser));
      
      // Cập nhật user trong localStorage nếu có
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user && !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
