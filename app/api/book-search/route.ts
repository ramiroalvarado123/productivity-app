import { getSessionUser } from "@/server/auth/session";

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
  language?: string[];
};

const languageCodes: Record<string, { query: string; preference: string }> = {
  es: { query: "spa", preference: "es" },
  en: { query: "eng", preference: "en" },
  pt: { query: "por", preference: "pt" },
  fr: { query: "fre", preference: "fr" },
  it: { query: "ita", preference: "it" },
  de: { query: "ger", preference: "de" },
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Necesitás iniciar sesión." }, { status: 401 });

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 160);
  const language = url.searchParams.get("language") ?? "any";
  const mode = url.searchParams.get("mode") === "discover" ? "discover" : "autocomplete";
  const limit = Math.max(1, Math.min(12, Number(url.searchParams.get("limit")) || (mode === "discover" ? 8 : 6)));
  if (query.length < 2) return Response.json({ books: [] });

  const languageConfig = languageCodes[language];
  const qualifiedQuery = languageConfig ? `${query} language:${languageConfig.query}` : query;
  const search = new URL("https://openlibrary.org/search.json");
  search.searchParams.set("q", qualifiedQuery);
  search.searchParams.set("fields", "key,title,author_name,first_publish_year,cover_i,number_of_pages_median,language");
  search.searchParams.set("limit", String(limit));
  if (languageConfig) search.searchParams.set("lang", languageConfig.preference);
  if (mode === "discover") search.searchParams.set("sort", "rating");

  try {
    const response = await fetch(search, { headers: { Accept: "application/json", "User-Agent": "Mi-Progreso/1.0" }, cf: { cacheTtl: 3600 } } as RequestInit & { cf: { cacheTtl: number } });
    if (!response.ok) throw new Error(`Open Library respondió ${response.status}`);
    const result = await response.json() as { docs?: OpenLibraryDoc[] };
    const seen = new Set<string>();
    const books = (result.docs ?? []).flatMap((book) => {
      const title = book.title?.trim();
      if (!title) return [];
      const author = book.author_name?.[0]?.trim() ?? "Autor no informado";
      const dedupeKey = `${title.toLowerCase()}|${author.toLowerCase()}`;
      if (seen.has(dedupeKey)) return [];
      seen.add(dedupeKey);
      return [{
        key: book.key ?? dedupeKey,
        title,
        author,
        year: book.first_publish_year ?? null,
        pages: book.number_of_pages_median ?? 0,
        coverUrl: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : "",
        languages: book.language ?? [],
        openLibraryUrl: book.key ? `https://openlibrary.org${book.key}` : "https://openlibrary.org/",
      }];
    });
    return Response.json({ books });
  } catch (error) {
    console.error("Open Library search failed", error);
    return Response.json({ error: "No pudimos consultar el catálogo de libros ahora. Intentá nuevamente." }, { status: 502 });
  }
}
