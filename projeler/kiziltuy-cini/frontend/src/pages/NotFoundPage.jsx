import { Result, Button } from "antd";
import { Link } from "react-router-dom";

const NotFoundPage = () => (
  <Result
    status="404"
    title="404"
    subTitle="Üzgünüz, aradığınız sayfa bulunamadı."
    extra={
      <Link to="/">
        <Button type="primary">Ana Sayfaya Dön</Button>
      </Link>
    }
  />
);

export default NotFoundPage;
