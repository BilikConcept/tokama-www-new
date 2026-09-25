import type { Metadata } from "next";
import { ContentStudio } from "@/components/content-studio/ContentStudio";

export const metadata: Metadata = { title: "Content Studio", robots: { index: false, follow: false } };
export default function AdminPage() { return <ContentStudio />; }

