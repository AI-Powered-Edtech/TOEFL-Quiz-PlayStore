
import React, { useState, useEffect, useRef } from 'react';

interface TypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
  showCursor?: boolean;
}

/**
 * Typewriter Component
 * 
 * Simulates streaming text effect.
 * Supports click-to-finish for better UX.
 */
export const Typewriter: React.FC<TypewriterProps> = ({ 
  text, 
  speed = 20, 
  onComplete, 
  className = "",
  showCursor = true
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isDone, setIsDone] = useState(false);
  
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Update ref when callback changes to avoid effect re-trigger
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Handle text changes
  useEffect(() => {
    setDisplayedText('');
    setIsDone(false);
    indexRef.current = 0;
    
    if (timerRef.current) clearInterval(timerRef.current);

    // If speed is 0, show immediately
    if (speed === 0) {
      setDisplayedText(text);
      setIsDone(true);
      if (onCompleteRef.current) onCompleteRef.current();
      return;
    }

    timerRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        // Append next character
        setDisplayedText((prev) => prev + text.charAt(indexRef.current));
        indexRef.current++;
      } else {
        finishTyping();
      }
    }, speed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text, speed]);

  const finishTyping = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setDisplayedText(text);
      setIsDone(true);
      if (onCompleteRef.current) onCompleteRef.current();
  };

  return (
    <div className={`${className} cursor-pointer`} onClick={finishTyping} title="Click to show all text">
      <span>{displayedText}</span>
      {showCursor && !isDone && (
        <span className="inline-block w-2 h-5 ml-1 align-middle bg-blue-500 animate-blink" />
      )}
    </div>
  );
};
