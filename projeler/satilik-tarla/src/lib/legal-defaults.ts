// Hukuki metin TASLAKLARI — seed bunlarla başlar, sahibi admin panelindeki
// zengin editörden gözden geçirip onaylar/düzenler (yayın sorumluluğu
// sahibindedir). Yalnızca seed import eder; client bundle'a girmez.

const SIRKET = 'Kütahya Satılık Tarla';
const EPOSTA = 'iletisim@kutahyasatiliktarla.com';

export const LEGAL_DEFAULTS: Record<
  'kvkk' | 'gizlilik' | 'cerez' | 'kosullar' | 'iys',
  { title: string; body: string }
> = {
  kvkk: {
    title: 'KVKK Aydınlatma Metni',
    body: `<p><em>Bu metin taslaktır; yayına almadan önce veri sorumlusu bilgilerini doğrulayınız.</em></p>
<h2>1. Veri Sorumlusu</h2>
<p>6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca kişisel verileriniz, veri sorumlusu sıfatıyla ${SIRKET} ("Platform") tarafından aşağıda açıklanan kapsamda işlenmektedir.</p>
<h2>2. İşlenen Kişisel Veriler</h2>
<ul>
<li><strong>Kimlik ve iletişim:</strong> ad-soyad, e-posta, telefon numarası.</li>
<li><strong>Üyelik ve işlem:</strong> hesap bilgileri, ilan başvuruları, favoriler, kayıtlı aramalar, platform içi mesajlar, şikayet kayıtları.</li>
<li><strong>Talep:</strong> arazi talep formunda ilettiğiniz bütçe, bölge ve amaç bilgileri.</li>
<li><strong>Teknik:</strong> IP adresi, oturum ve güvenlik kayıtları, çerez verileri.</li>
</ul>
<h2>3. İşleme Amaçları</h2>
<ul>
<li>Üyelik hesabının açılması ve yönetilmesi,</li>
<li>İlan başvurularının alınması, incelenmesi ve yayımlanması,</li>
<li>Alıcı ve satıcının platform üzerinden iletişiminin sağlanması,</li>
<li>Kayıtlı arama uyarıları ve bilgilendirme e-postalarının gönderilmesi,</li>
<li>Platform güvenliğinin sağlanması ve kötüye kullanımın önlenmesi,</li>
<li>Yasal yükümlülüklerin yerine getirilmesi.</li>
</ul>
<h2>4. Hukuki Sebepler ve Aktarım</h2>
<p>Kişisel verileriniz KVKK m.5/2 kapsamında sözleşmenin kurulması ve ifası, hukuki yükümlülük ve meşru menfaat sebeplerine dayanılarak işlenir. Veriler, hizmetin sağlanması için çalışılan barındırma ve e-posta altyapı sağlayıcılarıyla, yasal zorunluluk hâlinde yetkili kurumlarla paylaşılabilir; bunun dışında üçüncü kişilere satılmaz ve pazarlama amacıyla aktarılmaz.</p>
<h2>5. Saklama Süresi</h2>
<p>Veriler, üyelik süresince ve ilgili mevzuatta öngörülen zamanaşımı süreleri boyunca saklanır; sürelerin sonunda silinir, yok edilir veya anonim hâle getirilir.</p>
<h2>6. Haklarınız</h2>
<p>KVKK m.11 uyarınca; verilerinize erişme, düzeltme, silme, işlemeye itiraz etme ve zararınızın giderilmesini talep etme haklarına sahipsiniz. Başvurularınızı <a href="mailto:${EPOSTA}">${EPOSTA}</a> adresine iletebilirsiniz. Başvurular en geç 30 gün içinde yanıtlanır.</p>`,
  },
  gizlilik: {
    title: 'Gizlilik Politikası',
    body: `<p><em>Bu metin taslaktır; yayına almadan önce gözden geçiriniz.</em></p>
<p>${SIRKET} olarak gizliliğinize saygı duyuyoruz. Bu politika, platformu kullanırken hangi bilgilerin toplandığını ve nasıl kullanıldığını açıklar.</p>
<h2>Topladığımız Bilgiler</h2>
<ul>
<li>Üyelik sırasında verdiğiniz ad, e-posta ve şifre (şifreler geri döndürülemez şekilde özetlenerek saklanır),</li>
<li>İlan başvurularınızda ilettiğiniz arazi bilgileri,</li>
<li>Platform içi mesajlaşma içerikleri (yalnızca taraflar görebilir; ekip yazışmaları okuyamaz),</li>
<li>Talep formu bilgileri ve teknik kayıtlar.</li>
</ul>
<h2>Bilgilerin Kullanımı</h2>
<p>Bilgiler yalnızca hizmetin sunulması, güvenliğin sağlanması ve sizinle iletişim için kullanılır. E-posta bildirimleri; hesap doğrulama, ilan durumu, mesaj ve kayıtlı arama özetleriyle sınırlıdır.</p>
<h2>Güvenlik</h2>
<p>Veriler yalnızca yetkilendirilmiş sistemlerde barındırılır; şifreler modern özetleme algoritmalarıyla korunur, bağlantılar TLS ile şifrelenir.</p>
<h2>İletişim</h2>
<p>Gizlilikle ilgili sorularınız için: <a href="mailto:${EPOSTA}">${EPOSTA}</a></p>`,
  },
  cerez: {
    title: 'Çerez Politikası',
    body: `<p><em>Bu metin taslaktır; yayına almadan önce gözden geçiriniz.</em></p>
<p>${SIRKET}, platformun çalışması için sınırlı sayıda çerez kullanır.</p>
<h2>Kullanılan Çerezler</h2>
<ul>
<li><strong>Oturum çerezi (zorunlu):</strong> giriş yaptığınızda kimliğinizi doğrulamak için kullanılır; platform bu çerez olmadan çalışamaz.</li>
<li><strong>Tercih kayıtları:</strong> tarayıcınızın yerel depolamasında tutulan arayüz tercihleri.</li>
</ul>
<h2>Üçüncü Taraf Çerezleri</h2>
<p>Platformda reklam veya izleme amaçlı üçüncü taraf çerezi kullanılmamaktadır.</p>
<h2>Çerez Yönetimi</h2>
<p>Tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz; zorunlu çerezlerin engellenmesi hâlinde giriş gerektiren özellikler çalışmaz.</p>`,
  },
  kosullar: {
    title: 'Kullanım Koşulları',
    body: `<p><em>Bu metin taslaktır; yayına almadan önce gözden geçiriniz.</em></p>
<h2>1. Taraflar ve Kapsam</h2>
<p>Bu koşullar, ${SIRKET} platformunu ("Platform") ziyaret eden veya üye olan herkes için geçerlidir. Platformu kullanarak bu koşulları kabul etmiş sayılırsınız.</p>
<h2>2. Hizmetin Niteliği</h2>
<p>Platform, Kütahya ve ilçelerindeki arazi ilanlarını yayımlayan bir <strong>ilan platformudur</strong>; alım-satım işleminin tarafı değildir. İlan bilgileri ekip tarafından sahada doğrulanmaya çalışılsa da nihai hukuki durum (tapu, imar vb.) alıcı tarafından resmî kurumlardan teyit edilmelidir.</p>
<h2>3. Üyelik ve İlanlar</h2>
<ul>
<li>Üyeler yalnızca kendilerine ait ya da satmaya yetkili oldukları arazileri ilana verebilir.</li>
<li>İlan başvuruları ekip onayından geçer; gerçeğe aykırı bilgi içeren başvurular reddedilir.</li>
<li>Yayımlanan ilanların fotoğraf ve arazi bilgileri ekip tarafından eklenir; fiyat değişiklikleri ekip onayıyla yayına yansır.</li>
</ul>
<h2>4. Mesajlaşma ve Davranış Kuralları</h2>
<p>Platform içi mesajlaşma yalnızca ilanlarla ilgili iletişim içindir. Taciz, dolandırıcılık girişimi, yanıltıcı beyan ve mevzuata aykırı içerik yasaktır; ihlal hâlinde üyelik askıya alınabilir veya sonlandırılabilir.</p>
<h2>5. Sorumluluk</h2>
<p>Platform; ilan sahiplerinin beyanlarından, taraflar arasındaki görüşme ve sözleşmelerden doğan uyuşmazlıklardan sorumlu tutulamaz.</p>
<h2>6. Değişiklikler</h2>
<p>${SIRKET}, bu koşulları güncelleyebilir; güncel sürüm bu sayfada yayımlanır.</p>`,
  },
  iys: {
    title: 'Ticari Elektronik İleti Bilgilendirmesi',
    body: `<p><em>Bu metin taslaktır; yayına almadan önce gözden geçiriniz.</em></p>
<p>${SIRKET}, üyelerine yalnızca <strong>hizmet gereği</strong> e-posta gönderir: hesap doğrulama, şifre sıfırlama, ilan durumu bildirimleri, platform içi mesaj bildirimleri ve talebinizle oluşturduğunuz kayıtlı arama özetleri.</p>
<p>Bu iletiler 6563 sayılı Kanun kapsamında ticari amaç taşımayan, hizmetin ifasına ilişkin bildirimlerdir. Tanıtım/kampanya amaçlı ticari elektronik ileti gönderilmesi hâlinde, öncesinde İleti Yönetim Sistemi (İYS) üzerinden onayınız alınır.</p>
<p>Kayıtlı arama özetlerini hesabınızdaki "Kayıtlı Aramalarım" sayfasından dilediğiniz an durdurabilirsiniz. Diğer bildirim tercihleri için: <a href="mailto:${EPOSTA}">${EPOSTA}</a></p>`,
  },
};
