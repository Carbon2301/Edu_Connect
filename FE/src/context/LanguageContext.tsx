import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations } from '../i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Đọc ngôn ngữ từ localStorage hoặc sessionStorage khi khởi tạo
  const getInitialLanguage = (): Language => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') || sessionStorage.getItem('language');
      if (savedLanguage === 'vi' || savedLanguage === 'ja') {
        return savedLanguage as Language;
      }
    }
    return 'vi'; // Mặc định là tiếng Việt
  };

  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  // Lưu ngôn ngữ vào localStorage và sessionStorage khi thay đổi
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
      sessionStorage.setItem('language', lang);
    }
  };

  // Đồng bộ với storage khi component mount (để xử lý trường hợp nhiều tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'language' && e.newValue) {
        if (e.newValue === 'vi' || e.newValue === 'ja') {
          setLanguageState(e.newValue as Language);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.vi] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
