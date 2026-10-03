-- NERA10 passe de 10 % à 2 %. Le minimum d’achat reste inchangé.
UPDATE "Coupon"
SET "value" = 2
WHERE "code" = 'NERA10'
  AND "type" = 'PERCENT';
