import { CategoryGrid } from "@/components/home/category-grid";
import { EmotionGrid } from "@/components/home/emotion-grid";
import { Hero } from "@/components/home/hero";
import { listCategories, listEmotions } from "@/lib/services/catalog-service";

export default async function Home() {
  const [categories, emotions] = await Promise.all([listCategories(), listEmotions()]);

  return (
    <>
      <Hero />
      <CategoryGrid categories={categories} />
      <EmotionGrid emotions={emotions} />
    </>
  );
}
