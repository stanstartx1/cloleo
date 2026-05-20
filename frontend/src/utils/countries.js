export const COUNTRIES = [
  { code: "CI", name: "Cote d'Ivoire" },
  { code: "SN", name: "Senegal" },
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "CM", name: "Cameroun" },
  { code: "ML", name: "Mali" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BJ", name: "Benin" },
  { code: "TG", name: "Togo" },
  { code: "GN", name: "Guinee" },
  { code: "CD", name: "RDC" },
  { code: "MA", name: "Maroc" },
  { code: "TN", name: "Tunisie" },
  { code: "DZ", name: "Algerie" },
  { code: "ZA", name: "Afrique du Sud" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italie" },
  { code: "TR", name: "Turquie" },
  { code: "CN", name: "Chine" },
  { code: "IN", name: "Inde" },
  { code: "US", name: "Etats-Unis" },
];

export const getCountryByCode = (code) =>
  COUNTRIES.find((c) => c.code === code) || null;

export const getCountryFlagUrl = (code) => {
  if (!code) return "";
  return `https://flagcdn.com/24x18/${String(code).toLowerCase()}.png`;
};
