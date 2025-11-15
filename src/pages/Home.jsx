import Hero from "../components/Hero";
import About from "../components/About";
import Services from "../components/Services";
import Benefits from "../components/Benefits";
import Contact from "../components/Contact";
import PageTransition from "@/components/PageTransition";

const Home = () => {
  return (
    <PageTransition>
      <main>
        <Hero />
        <About />
        <Services />
        <Benefits />
        <Contact />
      </main>
    </PageTransition>
  );
};

export default Home;
