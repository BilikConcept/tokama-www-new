export const LEGACY_ARTICLE_SLUGS = {
  "10": "najciekawsze-wyspy-na-jezioraku",
  "11": "sekrety-jezioraka",
  "12": "rezerwaty-przyrody-w-okolicach-ilawy",
  "13": "ptaki-nad-jeziorem-labedz",
  "14": "romantyczny-weekend-nad-jeziorem",
  "15": "wyspa-wielka-zulawa",
  "16": "domki-przyjazne-zwierzetom",
  "17": "wynajem-domku-na-prywatna-uroczystosc",
  "18": "wedkarstwo-na-jezioraku-i-jeziorze-labedz",
  "19": "zeglowanie-po-pojezierzu-ilawskim",
  "20": "grzybobranie-na-pojezierzu-ilawskim",
  "21": "sporty-wodne-na-pojezierzu-ilawskim",
} as const;

export function getArticleSlugRedirect(slug: string) {
  return LEGACY_ARTICLE_SLUGS[slug as keyof typeof LEGACY_ARTICLE_SLUGS] || null;
}
