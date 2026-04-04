import Hero from "../components/Hero";
import FeaturedGenres from "../components/FeaturedGenres";
import Statement from "../components/Statement";
import ProductGrid from "../components/ProductGrid";
import Pagination from "../components/Pagination";
import GenreInteractive from "../components/GenreInteractive";
import Authors from "../components/Authors";

export default function Home() {
  return (
    <main>
      <Hero />
      <FeaturedGenres />
      <Statement />
      <ProductGrid />
      <Pagination />
      <GenreInteractive />
      <Authors />
    </main>
  );
}
