import { Modal } from "antd";
import PropTypes from "prop-types";

const Privacy = ({ visible, onClose }) => {
  return (
    <Modal
      title="Gizlilik Politikası ve Şartlar"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 10 }}>
        <h2>1. Gizlilik Politikası</h2>
        <p>
          Sitemiz, kullanıcı gizliliğine büyük önem verir. Tarafımıza iletilen
          hiçbir kişisel veri izinsiz üçüncü taraflarla paylaşılmaz. E-posta
          bültenimize abone olurken verdiğiniz bilgiler sadece duyuru ve
          kampanyalar için kullanılacaktır.
        </p>
        <p>
          Kullanıcı verileri, yalnızca sistem işleyişini sağlamak ve kullanıcı
          deneyimini iyileştirmek amacıyla toplanır. Bu bilgiler, gerekli
          durumlar dışında (örneğin yasal zorunluluk) hiçbir kişi veya kurumla
          paylaşılmaz.
        </p>

        <h2>2. E-Posta Bülteni Onayı</h2>
        <p>
          Bültenimize kayıt olarak, ürün güncellemeleri, kampanyalar ve içerik
          bildirimleri almak için tarafımızdan e-posta almayı kabul etmiş
          olursunuz. Dilediğiniz zaman bülten aboneliğinizi
          sonlandırabilirsiniz.
        </p>

        <h2>3. Şartlar ve Koşullar</h2>
        <p>
          Bu site üzerinden sunulan içerikler, yalnızca bilgilendirme amaçlıdır.
          Bağlantı verilen üçüncü parti sitelerdeki ürünlerden site sahibi
          sorumlu değildir.
        </p>
        <p>
          Kullanıcılar, sitede sağlanan bilgilerin doğruluğu konusunda kendi
          araştırmalarını yapmalı ve alışverişi üçüncü taraf siteler üzerinden
          gerçekleştirdiklerinin farkında olmalıdır.
        </p>

        <h2>4. Değişiklik Hakkı</h2>
        <p>
          Gizlilik politikası ve kullanım şartları zaman zaman güncellenebilir.
          Her kullanıcı bu güncellemeleri takip etmekle yükümlüdür.
        </p>
      </div>
    </Modal>
  );
};
Privacy.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default Privacy;
