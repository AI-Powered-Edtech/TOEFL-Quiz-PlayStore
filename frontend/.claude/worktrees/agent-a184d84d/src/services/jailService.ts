
import { QuizData } from "../types";

const STORAGE_KEY = 'streamquiz_error_jail_v1';

export const getJail = (): QuizData[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load jail", e);
    return [];
  }
};

export const addToJail = (question: QuizData) => {
  const current = getJail();
  // Avoid duplicates based on question prompt
  if (!current.find(q => q.prompt === question.prompt)) {
    const updated = [question, ...current];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  }
  return false;
};

export const removeFromJail = (questionPrompt: string) => {
  const current = getJail();
  const updated = current.filter(q => q.prompt !== questionPrompt);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const clearJail = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const getJailCount = (): number => {
  return getJail().length;
};
