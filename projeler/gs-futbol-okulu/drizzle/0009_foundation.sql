CREATE TABLE `consents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`registration_id` integer,
	`text_key` text NOT NULL,
	`version_id` integer NOT NULL,
	`accepted` integer NOT NULL,
	`method` text DEFAULT 'panel' NOT NULL,
	`note` text,
	`ip` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`version_id`) REFERENCES `legal_text_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `consents_user_idx` ON `consents` (`user_id`);--> statement-breakpoint
CREATE INDEX `consents_registration_idx` ON `consents` (`registration_id`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`storage_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`sha256` text NOT NULL,
	`registration_id` integer,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `files_storage_key_unique` ON `files` (`storage_key`);--> statement-breakpoint
CREATE INDEX `files_registration_idx` ON `files` (`registration_id`);--> statement-breakpoint
CREATE TABLE `legal_text_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text_key` text NOT NULL,
	`version` integer NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`published_at` text,
	FOREIGN KEY (`text_key`) REFERENCES `legal_texts`(`key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `legal_text_versions_key_version_unique` ON `legal_text_versions` (`text_key`,`version`);--> statement-breakpoint
CREATE TABLE `legal_texts` (
	`key` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`consent_type` text DEFAULT 'info' NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mail_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`to` text NOT NULL,
	`subject` text NOT NULL,
	`template` text,
	`status` text NOT NULL,
	`error` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `mail_log_created_at_idx` ON `mail_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_by` integer
);
--> statement-breakpoint
ALTER TABLE `registrations` ADD `student_no` integer;--> statement-breakpoint
ALTER TABLE `registrations` ADD `photo_file_id` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_student_no_unique` ON `registrations` (`student_no`);
--> statement-breakpoint
INSERT INTO `legal_texts` (`key`,`title`,`description`,`consent_type`,`sort`) VALUES ('kvkk-aydinlatma','KVKK Aydınlatma Metni','Kişisel verilerin hangi amaçla işlendiğini anlatır.','info',10);--> statement-breakpoint
INSERT INTO `legal_text_versions` (`text_key`,`version`,`body`,`status`,`published_at`) VALUES ('kvkk-aydinlatma',1,'Bu metin örnektir; yayına almadan önce hukuki danışmanınıza kontrol ettiriniz.

## Veri sorumlusu
Kütahya Galatasaray Futbol Okulları ("Okul"), 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusudur.

## İşlenen veriler
- Öğrencinin kimlik bilgileri (ad soyad, T.C. kimlik numarası, doğum tarihi)
- Veli ve acil durum kişisinin iletişim bilgileri (ad soyad, telefon, e-posta)
- Adres bilgisi
- Sağlık bilgileri (kan grubu, bildirilen sağlık durumu)
- Boy, kilo, antrenman devamı ve gelişim değerlendirmeleri
- Aidat ve ödeme kayıtları
- Fotoğraf (yalnızca ayrıca izin verilmişse)

## İşleme amaçları
- Futbol okulu kaydının yapılması ve yürütülmesi
- Antrenman programı, yoklama ve gelişim takibi
- Veliyle iletişim, duyuru ve bilgilendirme
- Aidat takibi
- Acil durumlarda ilgili kişilere ulaşılması

## Hukuki sebepler
Veriler; sözleşmenin kurulması ve ifası, hukuki yükümlülüklerin yerine getirilmesi, meşru menfaat ve gerekli hallerde açık rızanız hukuki sebeplerine dayanılarak işlenir.

## Aktarım
Kişisel veriler yasal zorunluluklar dışında üçüncü kişilerle paylaşılmaz. Veriler Türkiye''deki sunucularda saklanır.

## Saklama süresi
Veriler kayıt süresince ve kayıt sona erdikten sonra yasal saklama süreleri boyunca tutulur, sürenin sonunda silinir veya anonim hale getirilir.

## Haklarınız
KVKK''nın 11. maddesi kapsamındaki haklarınızı (bilgi talep etme, düzeltme, silme, itiraz vb.) kullanmak için Okul ile iletişime geçebilirsiniz.','published',strftime('%Y-%m-%dT%H:%M:%fZ','now'));--> statement-breakpoint
INSERT INTO `legal_texts` (`key`,`title`,`description`,`consent_type`,`sort`) VALUES ('acik-riza-saglik','Sağlık Verisi Açık Rıza Metni','Kan grubu ve sağlık bilgilerinin işlenmesi için açık rıza.','required',20);--> statement-breakpoint
INSERT INTO `legal_text_versions` (`text_key`,`version`,`body`,`status`,`published_at`) VALUES ('acik-riza-saglik',1,'Bu metin örnektir; yayına almadan önce hukuki danışmanınıza kontrol ettiriniz.

Çocuğumun kan grubu ve tarafımca bildirilen sağlık bilgilerinin; antrenman sırasında oluşabilecek acil durumlarda doğru müdahale yapılabilmesi ve antrenman yükünün çocuğumun sağlık durumuna göre ayarlanabilmesi amacıyla Kütahya Galatasaray Futbol Okulları tarafından işlenmesine açık rıza veriyorum.

Bu bilgiler yalnızca yetkili okul personelince görülebilir. Rızamı dilediğim zaman geri alabileceğimi biliyorum.','published',strftime('%Y-%m-%dT%H:%M:%fZ','now'));--> statement-breakpoint
INSERT INTO `legal_texts` (`key`,`title`,`description`,`consent_type`,`sort`) VALUES ('foto-izni','Fotoğraf Kullanım İzni','Öğrenci kartında ve okul içi kullanımda fotoğraf izni. İsteğe bağlıdır.','optional',30);--> statement-breakpoint
INSERT INTO `legal_text_versions` (`text_key`,`version`,`body`,`status`,`published_at`) VALUES ('foto-izni',1,'Bu metin örnektir; yayına almadan önce hukuki danışmanınıza kontrol ettiriniz.

Çocuğumun fotoğrafının öğrenci kartında ve okulun yönetim sisteminde kimlik doğrulama amacıyla kullanılmasına izin veriyorum.

- Fotoğraf sosyal medyada veya reklam amacıyla **kullanılmaz**.
- İzin vermezseniz kart fotoğrafsız basılır; hiçbir hizmet kısıtlanmaz.
- İzninizi dilediğiniz zaman geri alabilirsiniz; bu durumda fotoğraf sistemden silinir.','published',strftime('%Y-%m-%dT%H:%M:%fZ','now'));--> statement-breakpoint
INSERT INTO `legal_texts` (`key`,`title`,`description`,`consent_type`,`sort`) VALUES ('okul-kurallari','Okul Kuralları','Antrenman ve tesis kuralları.','required',40);--> statement-breakpoint
INSERT INTO `legal_text_versions` (`text_key`,`version`,`body`,`status`,`published_at`) VALUES ('okul-kurallari',1,'Bu metin örnektir; okulunuza göre düzenleyiniz.

- Öğrenciler antrenmana en az 10 dakika önce, uygun spor kıyafetiyle gelir.
- Antrenmana katılamayacak öğrenci için veli önceden haber verir.
- Antrenörün talimatlarına uyulur; takım arkadaşlarına ve rakiplere saygı esastır.
- Tesis ve malzemeler özenle kullanılır.
- Öğrenci antrenman bitiminde veli veya velinin bildirdiği kişi tarafından teslim alınır.
- Sağlık durumunda değişiklik olursa veli okula bilgi verir.','published',strftime('%Y-%m-%dT%H:%M:%fZ','now'));--> statement-breakpoint
INSERT INTO `legal_texts` (`key`,`title`,`description`,`consent_type`,`sort`) VALUES ('aidat-kurallari','Aidat ve Devam Kuralları','Aylık aidat, ödeme günü ve erişim kuralları.','required',50);--> statement-breakpoint
INSERT INTO `legal_text_versions` (`text_key`,`version`,`body`,`status`,`published_at`) VALUES ('aidat-kurallari',1,'Bu metin örnektir; okulunuza göre düzenleyiniz.

- Aidat aylıktır ve her öğrencinin **hesap kesim günü** kayıt olduğu gündür. Dönem, kesim gününden bir sonraki kesim gününe kadardır.
- Ödeme nakit veya banka havalesi (EFT) ile yapılır. EFT ile yapılan ödemede dekont sisteme yüklenir.
- Kesim gününden itibaren **3 gün** içinde ödeme yapılmazsa öğrencinin antrenmana katılımı ödeme alınana kadar durdurulur.
- Ödeme onaylandığında erişim hemen açılır.
- Deneme antrenmanı uygulanmaz.
- Kaydını dondurmak ya da sonlandırmak isteyen veli okula önceden bilgi verir.','published',strftime('%Y-%m-%dT%H:%M:%fZ','now'));--> statement-breakpoint
INSERT INTO `legal_texts` (`key`,`title`,`description`,`consent_type`,`sort`) VALUES ('veli-taahhut','Veli Taahhütnamesi','Velinin katılım izni ve beyanı.','required',60);--> statement-breakpoint
INSERT INTO `legal_text_versions` (`text_key`,`version`,`body`,`status`,`published_at`) VALUES ('veli-taahhut',1,'Bu metin örnektir; okulunuza göre düzenleyiniz.

Velisi bulunduğum öğrencinin Kütahya Galatasaray Futbol Okulları''ndaki antrenmanlara katılmasına izin veriyorum.

- Kayıt sırasında verdiğim bilgilerin doğru olduğunu, değişiklik olursa okula bildireceğimi,
- Çocuğumun spor yapmasına engel bir sağlık sorunu bulunmadığını, varsa okula yazılı olarak bildireceğimi,
- Okul kurallarına ve aidat kurallarına uyacağımı,
- Antrenman öncesi ve sonrası çocuğumun gözetiminin bana ait olduğunu

kabul ve taahhüt ederim.','published',strftime('%Y-%m-%dT%H:%M:%fZ','now'));--> statement-breakpoint
UPDATE `registrations` SET `student_no` = 1000 + (SELECT COUNT(*) FROM `registrations` r2 WHERE r2.`status` = 'enrolled' AND (COALESCE(r2.`enrolled_at`, r2.`created_at`) < COALESCE(`registrations`.`enrolled_at`, `registrations`.`created_at`) OR (COALESCE(r2.`enrolled_at`, r2.`created_at`) = COALESCE(`registrations`.`enrolled_at`, `registrations`.`created_at`) AND r2.`id` <= `registrations`.`id`))) WHERE `status` = 'enrolled';
