-- NERA10 retire 1 000 FCFA sur la facture, dès 20 000 FCFA d’articles.
UPDATE "Coupon"
SET "type" = 'FIXED',
    "value" = 1000
WHERE "code" = 'NERA10';
