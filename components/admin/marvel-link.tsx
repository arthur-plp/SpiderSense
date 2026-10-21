import { ExternalLink } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

/** Research tool for moderators completing a villain's file. */
export function MarvelEncyclopediaLink({ query }: { query?: string }) {
  const href = query
    ? `https://www.marvel.com/search?limit=20&query=${encodeURIComponent(query)}&offset=0&content_type=characters`
    : "https://www.marvel.com/characters";
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "md")}>
      <ExternalLink className="size-4" aria-hidden />
      Encyclopédie Marvel
      <span className="sr-only">(nouvel onglet)</span>
    </a>
  );
}
