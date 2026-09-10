import { auth } from "@mimo/auth";
import { CategoryGrid } from "@/components/home/category-grid";
import { EmotionGrid } from "@/components/home/emotion-grid";
import { FeaturedBusinesses } from "@/components/home/featured-businesses";
import { Hero } from "@/components/home/hero";
import { QuickFilters } from "@/components/home/quick-filters";
import { ReorderSection } from "@/components/home/reorder-section";
import { listFeaturedBusinesses } from "@/lib/services/business-service";
import { listCategories, listEmotions } from "@/lib/services/catalog-service";
import { listRecentlyOrderedProducts } from "@/lib/services/order-service";

export default async function Home() {
  const session = await auth();

  const [categories, emotions, featuredBusinesses, recentProducts] = await Promise.all([
    listCategories(),
    listEmotions(),
    listFeaturedBusinesses(),
    session?.user ? listRecentlyOrderedProducts(session.user.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <Hero />
      <CategoryGrid categories={categories} />
      <QuickFilters />
      <EmotionGrid emotions={emotions} />
      <FeaturedBusinesses businesses={featuredBusinesses} />
      <ReorderSection products={recentProducts} />
    </>
  );
}
