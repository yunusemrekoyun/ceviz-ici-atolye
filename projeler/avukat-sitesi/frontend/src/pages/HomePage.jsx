// src/pages/HomePage.jsx
import Hero from "../components/Hero";
import Institutional from "../components/Institutional";
import Services from "../components/Services";
import WorkingProcess from "../components/WorkingProcess";
import FAQ from "../components/FAQ";
import Contact from "../components/Contact";
import ContactForm from "../components/ContactForm";
import HomeArticles from "../components/HomeArticles";
import HomeDecisions from "../components/HomeDecisions";

const HomePage = () => {
  return (
    <>
      <Hero />

      {/* anchor hedefleri sticky header'a çarpmayınca dursun */}
      <main>
        <div id="hakkimda" className="scroll-mt-20 md:scroll-mt-24">
          <Institutional />
        </div>

        <div id="hizmetler" className="scroll-mt-20 md:scroll-mt-24">
          <Services />
        </div>

        <HomeArticles />
        <HomeDecisions />

        <WorkingProcess />
        <FAQ />

        <div id="iletisim" className="scroll-mt-20 md:scroll-mt-24">
          <Contact />
        </div>
        <ContactForm />
      </main>
    </>
  );
};

export default HomePage;
