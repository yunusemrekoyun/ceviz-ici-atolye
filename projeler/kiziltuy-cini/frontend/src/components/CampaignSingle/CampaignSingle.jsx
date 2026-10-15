import { Link } from "react-router-dom"
import "./CampaignSingle.css"
const CampaignSingle = () => {
  return (
    <section className="campaign-single">
    <div className="container">
      <div className="campaign-wrapper">
        <h2>                     </h2>
        <strong>                    </strong>
        {/* <span></span> */}
        <Link to={"/shop"} className="btn btn-lg">
          ÜRÜNLERE GÖZ ATIN
          <i className="bi bi-arrow-right"></i>
        </Link>
      </div>
    </div>
  </section>  )
}

export default CampaignSingle