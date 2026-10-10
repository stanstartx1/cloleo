import React, { useEffect, useRef } from 'react';
import { Input } from './ui/input';

const VerificationCodeInput = ({ value, onChange, length = 6 }) => {
  const inputsRef = useRef([]);

  const handleChange = (e, index) => {
    const inputValue = e.target.value;
    
    // N'accepter que les chiffres
    if (!/^\d*$/.test(inputValue)) return;
    
    // Prendre le dernier caractère entré
    const char = inputValue.slice(-1);
    
    // Mettre à jour la valeur
    const newValue = value.split('');
    newValue[index] = char;
    onChange(newValue.join(''));
    
    // Auto-focus sur la case suivante
    if (char && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // Gérer la touche Backspace
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        // Si la case est vide, aller à la case précédente
        inputsRef.current[index - 1]?.focus();
      } else {
        // Sinon, vider la case actuelle
        const newValue = value.split('');
        newValue[index] = '';
        onChange(newValue.join(''));
      }
    }
    
    // Gérer les flèches gauche/droite
    if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    
    // Ne prendre que les chiffres
    const digits = pastedData.replace(/\D/g, '').slice(0, length);
    
    if (digits.length > 0) {
      onChange(digits.padEnd(length, ''));
      
      // Focus sur la dernière case remplie
      const lastIndex = Math.min(digits.length, length) - 1;
      inputsRef.current[lastIndex]?.focus();
    }
  };

  // Focus sur la première case au montage
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          ref={(el) => (inputsRef.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className="w-12 h-12 text-center text-2xl font-bold"
        />
      ))}
    </div>
  );
};

export default VerificationCodeInput;
