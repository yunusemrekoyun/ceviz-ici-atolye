import "./landing.css";
import { LandingFooter } from "./LandingFooter";
import { LandingStage } from "./LandingStage";

export function LandingPage() {
  return (
    <div className="lp-root min-h-screen">
      <LandingStage />
      <LandingFooter />
    </div>
  );
}
