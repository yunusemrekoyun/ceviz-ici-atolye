import Sliders from "../components/Slider/Sliders";
import Categories from "../components/Categories/Categories";
import Products from "../components/Products/Products";
import Brands from "../components/Brands/Brands";
import CampaignSingle from "../components/CampaignSingle/CampaignSingle";

const HomePage = () => {
  return (
    <>
      <Sliders />
      <Categories />
      <Products
        eyebrow="Yeni gelenler"
        title="Bu hafta öne çıkanlar"
        query="sort=dateDesc"
        limit={8}
        moreLink="/shop"
      />
      <CampaignSingle />
      <Products
        eyebrow="Fırsatlar"
        title="İndirimdeki ürünler"
        query="discounted=true"
        limit={4}
        moreLink="/shop?discounted=true"
      />
      <Brands />
    </>
  );
};

export default HomePage;
