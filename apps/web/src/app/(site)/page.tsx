import { auth } from "@mimo/auth";
import { CategoryGrid } from "@/components/home/category-grid";
import { EmotionGrid } from "@/components/home/emotion-grid";
import { FeaturedBusinesses } from "@/components/home/featured-businesses";
import { Hero } from "@/components/home/hero";
import { QuickFilters } from "@/components/home/quick-filters";
import { ReorderSection } from "@/components/home/reorder-section";
import { UpcomingDatesBanner } from "@/components/home/upcoming-dates-banner";
import { listFeaturedBusinesses } from "@/lib/services/business-service";
import { listCategories, listEmotions } from "@/lib/services/catalog-service";
import { checkImportantDateReminders, listImportantDates } from "@/lib/services/important-date-service";
import { listRecentlyOrderedProducts } from "@/lib/services/order-service";

export default async function Home() {
  const session = await auth();

  const [categories, emotions, featuredBusinesses, recentProducts, importantDates] = await Promise.all([
    listCategories(),
    listEmotions(),
    listFeaturedBusinesses(),
    session?.user ? listRecentlyOrderedProducts(session.user.id) : Promise.resolve([]),
    session?.user ? listImportantDates(session.user.id) : Promise.resolve([]),
  ]);

  if (session?.user) {
    // Sin cron real detrás (ver nota en important-date-service.ts): se revisa
    // de forma perezosa cada vez que el usuario visita el home.
    await checkImportantDateReminders(session.user.id);
  }

  return (
    <>
      <Hero />
      {session?.user && <UpcomingDatesBanner dates={importantDates} />}
      <CategoryGrid categories={categories} />
      <QuickFilters />
      <EmotionGrid emotions={emotions} />
      <FeaturedBusinesses businesses={featuredBusinesses} />
      <ReorderSection products={recentProducts} />
    </>
  );
}
