import React from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const LanguageSwitcher = ({ mobile = false }) => {
  const { language, languages, setLanguage, t } = useLanguage();
  const activeLanguage = languages.find((item) => item.code === language) || languages[0];

  if (mobile) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><Languages className="h-4 w-4" /> {t('nav.language')}</p>
        <div className="grid grid-cols-2 gap-2">
          {languages.map((item) => (
            <button key={item.code} type="button" onClick={() => setLanguage(item.code)} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-bold transition-all ${language === item.code ? 'border-orange-400 bg-white text-orange-600 shadow-sm' : 'border-transparent bg-white text-slate-600 hover:border-orange-200'}`}>
              <span className="text-lg leading-none" aria-hidden="true">{item.flag}</span>{item.label}
              {language === item.code && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={t('nav.language')} className="group hidden min-[420px]:inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300">
          <span className="text-base leading-none" aria-hidden="true">{activeLanguage.flag}</span>
          <span className="hidden xl:inline">{activeLanguage.shortLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-xl border-slate-200 p-1.5 shadow-xl">
        <p className="px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('nav.language')}</p>
        <DropdownMenuRadioGroup value={language} onValueChange={setLanguage}>
          {languages.map((item) => (
            <DropdownMenuRadioItem key={item.code} value={item.code} onSelect={() => setLanguage(item.code)} className="cursor-pointer rounded-lg py-2.5 pl-2.5 text-sm font-semibold focus:bg-orange-50 focus:text-orange-700">
              <span className="mr-2 text-lg leading-none" aria-hidden="true">{item.flag}</span>
              <span>{item.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
