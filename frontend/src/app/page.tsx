import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import FeaturedGenres from "../components/FeaturedGenres";
import Statement from "../components/Statement";
import ProductGrid from "../components/ProductGrid";
import Pagination from "../components/Pagination";
import GenreInteractive from "../components/GenreInteractive";
import Authors from "../components/Authors";
import Footer from "../components/Footer";
import CustomCursor from "../components/CustomCursor";

export default function Home() {
  return (
    <>
      <CustomCursor />
      <Navbar />
      <main>
        <Hero />
        <FeaturedGenres />
        <Statement />
        <ProductGrid />
        <Pagination />
        <GenreInteractive />
        <Authors />
      </main>
      <Footer />
    </>
  );
}
