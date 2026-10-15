import { Fragment } from "react";
import Sliders from "../components/Slider/Sliders";
import Categories from "../components/Categories/Categories";
import Products from "../components/Products/Products";
import Campaigns from "../components/Campaigns/Campaigns";
import Blogs from "../components/Blogs/Blogs";
// import Brands from "../components/Brands/Brands";
import CampaignSingle from "../components/CampaignSingle/CampaignSingle";
const HomePage = () => {
  return (
    <Fragment>
      <Sliders />
      <Categories />
      <Products />
      <Campaigns />
      <Products />
      <Blogs />
       
      {/* <Brands /> */}
      <CampaignSingle />
    </Fragment>
  );
};

export default HomePage;
