import { Language } from '../i18n';

interface User {
  fullName: string;
  nameKana?: string;
}

/**
 * Format user name based on current language
 * For Japanese language, returns nameKana if available, otherwise fallback to fullName
 * For other languages, returns fullName
 */
export const formatUserName = (user: User | null | undefined, language: Language): string => {
  if (!user) return '';
  
  if (language === 'ja' && user.nameKana) {
    return user.nameKana;
  }
  
  return user.fullName;
};

/**
 * Format student name based on current language
 * Alias for formatUserName for clarity when dealing with students
 */
export const formatStudentName = (student: User | null | undefined, language: Language): string => {
  return formatUserName(student, language);
};

