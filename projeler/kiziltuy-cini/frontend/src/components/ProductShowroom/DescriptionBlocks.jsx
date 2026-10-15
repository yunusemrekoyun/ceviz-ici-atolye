import { useEffect, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import PropTypes from "prop-types";
import "./DescriptionBlocks.css";

const DescriptionBlocks = ({ product }) => {
  const [blockPairs, setBlockPairs] = useState([]);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    AOS.init({
      duration: 1200,
      once: false,
      offset: 100,
      easing: "ease-in-out",
    });
  }, []);

  useEffect(() => {
    const pairs = [];
    const images1 = product.childImages1 || [];
    const images2 = product.childImages2 || [];

    const desc1 = Array.isArray(product.childDescription1)
      ? product.childDescription1
      : product.childDescription1
      ? [product.childDescription1]
      : [];

    const desc2 = Array.isArray(product.childDescription2)
      ? product.childDescription2
      : product.childDescription2
      ? [product.childDescription2]
      : [];

    const max = Math.max(
      images1.length,
      desc1.length,
      images2.length,
      desc2.length
    );

    for (let i = 0; i < max; i++) {
      if (images1[i] || desc1[i]) {
        pairs.push({
          img: `${apiUrl}/api/products/${product._id}/image/childImages1/${i}`,
          text: desc1[i] || "",
          aos: "fade-up-right",
        });
      }
      if (images2[i] || desc2[i]) {
        pairs.push({
          img: `${apiUrl}/api/products/${product._id}/image/childImages2/${i}`,
          text: desc2[i] || "",
          aos: "fade-up-left",
        });
      }
    }

    setBlockPairs(pairs);
  }, [product, apiUrl]);

  return (
    <section id="description-blocks" className="desc-section">
      {blockPairs.map((block, index) => (
        <div key={index} className="desc-block" data-aos={block.aos}>
          <div className="desc-image">
            <img src={block.img} alt="Ürün detay görseli" />
          </div>
          <div className="desc-content">
            <h3>Açıklama {index + 1}</h3>
            <p>{block.text}</p>
          </div>
        </div>
      ))}
    </section>
  );
};

DescriptionBlocks.propTypes = {
  product: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    childImages1: PropTypes.array,
    childImages2: PropTypes.array,
    childDescription1: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
    childDescription2: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
  }).isRequired,
};

export default DescriptionBlocks;
