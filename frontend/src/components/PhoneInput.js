import React, { useState } from 'react';
import { Phone } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';

const PhoneInput = ({ value, onChange, label = "Numéro de téléphone", placeholder = "+225 07 00 00 00 00" }) => {
  const [displayValue, setDisplayValue] = useState(value || '');

  const formatPhoneNumber = (value) => {
    // Supprimer tous les caractères non numériques sauf le +
    let cleaned = value.replace(/[^\d+]/g, '');
    
    // Formatage pour la Côte d'Ivoire (+225)
    if (cleaned.startsWith('+225')) {
      const local = cleaned.substring(4);
      if (local.length > 0) {
        if (local.length <= 2) {
          cleaned = `+225 ${local}`;
        } else if (local.length <= 4) {
          cleaned = `+225 ${local.slice(0, 2)} ${local.slice(2)}`;
        } else if (local.length <= 6) {
          cleaned = `+225 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4)}`;
        } else if (local.length <= 8) {
          cleaned = `+225 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6)}`;
        } else {
          cleaned = `+225 ${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`;
        }
      } else {
        cleaned = '+225 ';
      }
    } else if (!cleaned.startsWith('+')) {
      // Si pas de +, ajouter +225 par défaut
      if (cleaned.length > 0) {
        if (cleaned.length <= 2) {
          cleaned = `+225 ${cleaned}`;
        } else if (cleaned.length <= 4) {
          cleaned = `+225 ${cleaned.slice(0, 2)} ${cleaned.slice(2)}`;
        } else if (cleaned.length <= 6) {
          cleaned = `+225 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4)}`;
        } else if (cleaned.length <= 8) {
          cleaned = `+225 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6)}`;
        } else {
          cleaned = `+225 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
        }
      } else {
        cleaned = '+225 ';
      }
    }
    
    return cleaned;
  };

  const handleChange = (e) => {
    const inputValue = e.target.value;
    const formatted = formatPhoneNumber(inputValue);
    setDisplayValue(formatted);
    
    // Envoyer la valeur sans formatage au parent
    const cleaned = formatted.replace(/[^\d+]/g, '');
    onChange(cleaned);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="phone" className="flex items-center gap-2">
        <Phone className="w-4 h-4" />
        {label}
      </Label>
      <Input
        id="phone"
        type="tel"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="text-lg"
      />
    </div>
  );
};

export default PhoneInput;
