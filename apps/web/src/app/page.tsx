import { CategoryGrid } from "@/components/home/category-grid";
import { EmotionGrid } from "@/components/home/emotion-grid";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { listCategories, listEmotions } from "@/lib/services/catalog-service";

export default async function Home() {
  const [categories, emotions] = await Promise.all([listCategories(), listEmotions()]);

  return (
    <>
      <Hero />
      <EmotionGrid emotions={emotions} />
      <CategoryGrid categories={categories} />
      <HowItWorks />
    </>
  );
}
