import { getRecentQueries } from "@/lib/storage";
import HomeExperience from "@/components/HomeExperience";

export const dynamic = "force-dynamic";

const SUGGESTIONS = [
  "Best AI screen login",
  "nextjs 16 app router",
  "electric cars 2027",
  "northern lights iceland",
  "sourdough bread recipe",
  "أفضل السيارات الكهربائية",
];

export default async function HomePage() {
  let recent: string[] = [];
  let totalSearches = 0;
  try {
    const data = await getRecentQueries(6);
    recent = data.recent;
    totalSearches = data.totalSearches;
  } catch {
    /* keep defaults */
  }

  return (
    <HomeExperience
      recent={recent}
      suggestions={SUGGESTIONS}
      totalSearches={totalSearches}
    />
  );
}
