-- Eşofmanın varsayılan fiyatı (Malzeme > Ürünler'den değiştirilebilir); elle girilmiş fiyata dokunulmaz.
UPDATE `equipment_items` SET `price_kurus` = 220000 WHERE `name` = 'Eşofman' AND `price_kurus` = 0;
