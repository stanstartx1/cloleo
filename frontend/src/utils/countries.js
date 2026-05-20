export const COUNTRIES = [
  { code: "CI", name: "Cote d'Ivoire", flag: "🇨🇮" },
  { code: "SN", name: "Senegal", flag: "🇸🇳" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "CM", name: "Cameroun", flag: "🇨🇲" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "BJ", name: "Benin", flag: "🇧🇯" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "GN", name: "Guinee", flag: "🇬🇳" },
  { code: "CD", name: "RDC", flag: "🇨🇩" },
  { code: "MA", name: "Maroc", flag: "🇲🇦" },
  { code: "TN", name: "Tunisie", flag: "🇹🇳" },
  { code: "DZ", name: "Algerie", flag: "🇩🇿" },
  { code: "ZA", name: "Afrique du Sud", flag: "🇿🇦" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "IT", name: "Italie", flag: "🇮🇹" },
  { code: "TR", name: "Turquie", flag: "🇹🇷" },
  { code: "CN", name: "Chine", flag: "🇨🇳" },
  { code: "IN", name: "Inde", flag: "🇮🇳" },
  { code: "US", name: "Etats-Unis", flag: "🇺🇸" },
];

export const getCountryByCode = (code) =>
  COUNTRIES.find((c) => c.code === code) || null;
