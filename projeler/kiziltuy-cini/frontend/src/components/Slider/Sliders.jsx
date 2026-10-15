import { useState, useEffect, useRef } from "react";
import SliderItem from "./SliderItem";
import "./Sliders.css";

const slides = [
  "img/slider/slider1.jpg",
  "img/slider/slider2.jpg",
  "img/slider/slider3.jpg",
];

const Sliders = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideRef = useRef(null);
  const isMobile = window.innerWidth <= 768;

  const handleTouchStart = useRef(null);
  const handleTouchEnd = useRef(null);

  useEffect(() => {
    if (!isMobile) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isMobile]);

  const onTouchStart = (e) => {
    handleTouchStart.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    handleTouchEnd.current = e.changedTouches[0].clientX;
    const diff = handleTouchStart.current - handleTouchEnd.current;
    if (diff > 50) {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    } else if (diff < -50) {
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    }
  };

  return (
    <section className="slider">
      <div
        className="slider-elements"
        ref={slideRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {!isMobile ? (
          <>
            {currentSlide === 0 && (
              <SliderItem imageSrc="img/slider/slider1.jpg" />
            )}
            {currentSlide === 1 && (
              <SliderItem imageSrc="img/slider/slider2.jpg" />
            )}
            {currentSlide === 2 && (
              <SliderItem imageSrc="img/slider/slider3.jpg" />
            )}
            <div className="slider-buttons">
              <button
                onClick={() =>
                  setCurrentSlide(
                    (prev) => (prev - 1 + slides.length) % slides.length
                  )
                }
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              <button
                onClick={() =>
                  setCurrentSlide((prev) => (prev + 1) % slides.length)
                }
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              className="slider-track"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {slides.map((src, idx) => (
                <SliderItem key={idx} imageSrc={src} />
              ))}
            </div>
            <div className="slider-progress-wrapper">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={`slider-progress-dot ${
                    currentSlide === i ? "active" : ""
                  }`}
                >
                  {currentSlide === i && <div className="fill"></div>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Sliders;
