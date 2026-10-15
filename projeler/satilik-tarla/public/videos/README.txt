DRONE VİDEO KLASÖRÜ
====================

Gerçek drone çekimlerini bu klasöre koyun. Her ilan için bir .mp4 dosyası:

  public/videos/tavsanli-yola-yakin.mp4
  public/videos/gediz-yatirimlik.mp4
  public/videos/merkez-koy-ici.mp4

Bu klasördeki dosyalara tarayıcıdan şu adresle erişilir (başında /videos/):

  /videos/tavsanli-yola-yakin.mp4

Sonra src/App.tsx içindeki ilgili ilanın "droneVideo" alanını güncelleyin:

  droneVideo: '/videos/tavsanli-yola-yakin.mp4',

ÖNERİLER (profesyonel görünüm + akıcı oynatma için)
---------------------------------------------------
- Format: MP4 (H.264 video + AAC ses) — tüm tarayıcılarda çalışır.
- Çözünürlük: 1920x1080 (1080p) yeterli; 4K dosyalar çok büyür, yavaş açılır.
- Bitrate: 8-12 Mbps civarı. Dosya boyutunu ~30-80 MB arasında tutmaya çalışın.
- Süre: 30-90 saniye ideal. Tüm araziyi, sınırları ve yolu gösterin.
- Sıkıştırma örneği (ffmpeg kuruluysa):
    ffmpeg -i ham-cekim.mp4 -c:v libx264 -crf 23 -preset slow -vf scale=1920:-2 -c:a aac -b:a 128k tavsanli-yola-yakin.mp4

NOT: Kendi sunucunuzda barındıracağınız için, siteyi yayına aldığınızda
bu /videos/ klasörü otomatik olarak sunucudan servis edilir. Çok izlenme
olursa ileride bir CDN önüne koymayı tekrar değerlendirebiliriz.
