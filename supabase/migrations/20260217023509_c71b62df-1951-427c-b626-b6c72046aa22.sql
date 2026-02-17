-- Step 1: Remove all non-digit characters
UPDATE whatsapp_contacts
SET phone = regexp_replace(phone, '[^0-9]', '', 'g')
WHERE phone ~ '[^0-9]';

-- Step 2: Add country code 55 for numbers with 10-11 digits
UPDATE whatsapp_contacts
SET phone = '55' || phone
WHERE length(phone) IN (10, 11)
  AND phone NOT LIKE '55%';

-- Step 3: Add 9th digit for numbers with 12 digits (55 + DDD + 8 digits)
UPDATE whatsapp_contacts
SET phone = substring(phone, 1, 4) || '9' || substring(phone, 5)
WHERE length(phone) = 12
  AND phone LIKE '55%';