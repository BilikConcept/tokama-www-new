export type BlogSection = {
  heading: string;
  paragraphs: string[];
};

export type BlogFaq = {
  question: string;
  answer: string;
};

export type BlogArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  intro: string;
  publishedAt?: string;
  updatedAt?: string;
  readingTime?: number;
  author?: string;
  image?: string;
  sections: BlogSection[];
  faq?: BlogFaq[];
  relatedSlugs?: string[];
};
