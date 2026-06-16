DELETE FROM public.spn_book_units WHERE book_id='e71bbcb2-3e97-49e7-b117-cff5bb2e9d75';
UPDATE public.spn_books SET name='Book 1', description='Start from zero — greetings, pronouns, verb to be, present simple, and more.', cover_color='#10b981', sort_order=0 WHERE id='e71bbcb2-3e97-49e7-b117-cff5bb2e9d75';

DO $$
DECLARE
  u1_id uuid := gen_random_uuid();
  u2_id uuid := gen_random_uuid();
  u3_id uuid := gen_random_uuid();
  u4_id uuid := gen_random_uuid();
  u5_id uuid := gen_random_uuid();
  u6_id uuid := gen_random_uuid();
  u7_id uuid := gen_random_uuid();
  u8_id uuid := gen_random_uuid();
  u9_id uuid := gen_random_uuid();
  u10_id uuid := gen_random_uuid();
  u11_id uuid := gen_random_uuid();
  u12_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.spn_book_units (id, book_id, name, sort_order) VALUES
    (u1_id,'e71bbcb2-3e97-49e7-b117-cff5bb2e9d75','Unit 1: Greetings & Introductions',0),
    (u2_id,'e71bbcb2-3e97-49e7-b117-cff5bb2e9d75','Unit 2: Subject Pronouns',1),
    (u3_id,'e71bbcb2-3e97-49e7-b117-cff5bb2e9d75','Unit 3: Verb To Be',2),
    (u4_id,'e71bbcb2-3e97-49e7-b117-cff5bb2e9d75','Unit 4: Common Verbs I',3),
    (u5_id,'e71bbcb2-3e97-49e7-b117-cff5bb2e9d75','Unit 5: Articles & Common Nouns',4),
    (u6_id,'e71bbcb2-3e97-49e7-b117-cff5bb2e9d75','Unit 6: Possessives',5),
    (u7_id,'e71bbcb2-3e97-49e7-b117-cff5bb2e9d75','Unit 7: Present Simple + Do/Does',6),
    (u8_id,'e71bbcb2-3e97-49e7-b117-cff5bb2e9d75','Unit 8: WH-Questions',7),
    (u9_id,'e71bbcb2-3e97-49e7-b117-cff5bb2e9d75','Unit 9: Prepositions & Connectors',8),
    (u10_id,'e71bbcb2-3e97-49e7-b117-cff5bb2e9d75','Unit 10: Numbers, Days & Time',9),
    (u11_id,'e71bbcb2-3e97-49e7-b117-cff5bb2e9d75','Unit 11: Family & People',10),
    (u12_id,'e71bbcb2-3e97-49e7-b117-cff5bb2e9d75','Unit 12: Likes & Dislikes',11);

  INSERT INTO public.spn_word_bank_items (unit_id, word, phonetic, sort_order) VALUES
    (u1_id,'hello','/həˈloʊ/',0),(u1_id,'hi','/haɪ/',1),(u1_id,'goodbye','/ɡʊdˈbaɪ/',2),(u1_id,'bye','/baɪ/',3),(u1_id,'good morning','/ɡʊd ˈmɔːrnɪŋ/',4),(u1_id,'good afternoon','/ɡʊd ˌæftərˈnuːn/',5),(u1_id,'good evening','/ɡʊd ˈiːvnɪŋ/',6),(u1_id,'good night','/ɡʊd naɪt/',7),(u1_id,'name','/neɪm/',8),(u1_id,'nice','/naɪs/',9),(u1_id,'meet','/miːt/',10),(u1_id,'you','/juː/',11),(u1_id,'I','/aɪ/',12),(u1_id,'am','/æm/',13),(u1_id,'please','/pliːz/',14),(u1_id,'thanks','/θæŋks/',15),(u1_id,'thank you','/θæŋk juː/',16),(u1_id,'sorry','/ˈsɒri/',17),(u1_id,'yes','/jɛs/',18),(u1_id,'no','/noʊ/',19),
    (u2_id,'I','/aɪ/',0),(u2_id,'you','/juː/',1),(u2_id,'he','/hiː/',2),(u2_id,'she','/ʃiː/',3),(u2_id,'it','/ɪt/',4),(u2_id,'we','/wiː/',5),(u2_id,'they','/ðeɪ/',6),(u2_id,'man','/mæn/',7),(u2_id,'woman','/ˈwʊmən/',8),(u2_id,'boy','/bɔɪ/',9),(u2_id,'girl','/ɡɜːrl/',10),(u2_id,'person','/ˈpɜːrsən/',11),(u2_id,'people','/ˈpiːpəl/',12),(u2_id,'friend','/frɛnd/',13),(u2_id,'teacher','/ˈtiːtʃər/',14),(u2_id,'student','/ˈstuːdənt/',15),(u2_id,'dog','/dɒɡ/',16),(u2_id,'cat','/kæt/',17),(u2_id,'book','/bʊk/',18),(u2_id,'car','/kɑːr/',19),
    (u3_id,'am','/æm/',0),(u3_id,'is','/ɪz/',1),(u3_id,'are','/ɑːr/',2),(u3_id,'not','/nɒt/',3),(u3_id,'happy','/ˈhæpi/',4),(u3_id,'sad','/sæd/',5),(u3_id,'tired','/ˈtaɪərd/',6),(u3_id,'hungry','/ˈhʌŋɡri/',7),(u3_id,'thirsty','/ˈθɜːrsti/',8),(u3_id,'busy','/ˈbɪzi/',9),(u3_id,'ready','/ˈrɛdi/',10),(u3_id,'late','/leɪt/',11),(u3_id,'here','/hɪər/',12),(u3_id,'there','/ðɛər/',13),(u3_id,'home','/hoʊm/',14),(u3_id,'school','/skuːl/',15),(u3_id,'work','/wɜːrk/',16),(u3_id,'Brazilian','/brəˈzɪliən/',17),(u3_id,'English','/ˈɪŋɡlɪʃ/',18),(u3_id,'teacher','/ˈtiːtʃər/',19),
    (u4_id,'eat','/iːt/',0),(u4_id,'drink','/drɪŋk/',1),(u4_id,'want','/wɒnt/',2),(u4_id,'like','/laɪk/',3),(u4_id,'play','/pleɪ/',4),(u4_id,'go','/ɡoʊ/',5),(u4_id,'have','/hæv/',6),(u4_id,'see','/siː/',7),(u4_id,'read','/riːd/',8),(u4_id,'write','/raɪt/',9),(u4_id,'speak','/spiːk/',10),(u4_id,'listen','/ˈlɪsən/',11),(u4_id,'study','/ˈstʌdi/',12),(u4_id,'work','/wɜːrk/',13),(u4_id,'sleep','/sliːp/',14),(u4_id,'run','/rʌn/',15),(u4_id,'walk','/wɔːk/',16),(u4_id,'come','/kʌm/',17),(u4_id,'need','/niːd/',18),(u4_id,'know','/noʊ/',19),
    (u5_id,'a','/ə/',0),(u5_id,'an','/ən/',1),(u5_id,'the','/ðə/',2),(u5_id,'apple','/ˈæpəl/',3),(u5_id,'orange','/ˈɔːrɪndʒ/',4),(u5_id,'water','/ˈwɔːtər/',5),(u5_id,'juice','/dʒuːs/',6),(u5_id,'coffee','/ˈkɒfi/',7),(u5_id,'tea','/tiː/',8),(u5_id,'bread','/brɛd/',9),(u5_id,'rice','/raɪs/',10),(u5_id,'chicken','/ˈtʃɪkɪn/',11),(u5_id,'table','/ˈteɪbəl/',12),(u5_id,'chair','/tʃɛər/',13),(u5_id,'door','/dɔːr/',14),(u5_id,'window','/ˈwɪndoʊ/',15),(u5_id,'house','/haʊs/',16),(u5_id,'phone','/foʊn/',17),(u5_id,'computer','/kəmˈpjuːtər/',18),(u5_id,'pen','/pɛn/',19),
    (u6_id,'my','/maɪ/',0),(u6_id,'your','/jʊər/',1),(u6_id,'his','/hɪz/',2),(u6_id,'her','/hɜːr/',3),(u6_id,'its','/ɪts/',4),(u6_id,'our','/aʊər/',5),(u6_id,'their','/ðɛər/',6),(u6_id,'father','/ˈfɑːðər/',7),(u6_id,'mother','/ˈmʌðər/',8),(u6_id,'brother','/ˈbrʌðər/',9),(u6_id,'sister','/ˈsɪstər/',10),(u6_id,'son','/sʌn/',11),(u6_id,'daughter','/ˈdɔːtər/',12),(u6_id,'friend','/frɛnd/',13),(u6_id,'name','/neɪm/',14),(u6_id,'house','/haʊs/',15),(u6_id,'car','/kɑːr/',16),(u6_id,'dog','/dɒɡ/',17),(u6_id,'job','/dʒɒb/',18),(u6_id,'phone','/foʊn/',19),
    (u7_id,'do','/duː/',0),(u7_id,'does','/dʌz/',1),(u7_id,'don''t','/doʊnt/',2),(u7_id,'doesn''t','/ˈdʌzənt/',3),(u7_id,'every','/ˈɛvri/',4),(u7_id,'always','/ˈɔːlweɪz/',5),(u7_id,'usually','/ˈjuːʒuəli/',6),(u7_id,'often','/ˈɒfən/',7),(u7_id,'sometimes','/ˈsʌmtaɪmz/',8),(u7_id,'never','/ˈnɛvər/',9),(u7_id,'morning','/ˈmɔːrnɪŋ/',10),(u7_id,'afternoon','/ˌæftərˈnuːn/',11),(u7_id,'night','/naɪt/',12),(u7_id,'weekend','/ˈwiːkɛnd/',13),(u7_id,'breakfast','/ˈbrɛkfəst/',14),(u7_id,'lunch','/lʌntʃ/',15),(u7_id,'dinner','/ˈdɪnər/',16),(u7_id,'watch','/wɒtʃ/',17),(u7_id,'TV','/ˌtiːˈviː/',18),(u7_id,'music','/ˈmjuːzɪk/',19),
    (u8_id,'what','/wɒt/',0),(u8_id,'where','/wɛər/',1),(u8_id,'when','/wɛn/',2),(u8_id,'who','/huː/',3),(u8_id,'why','/waɪ/',4),(u8_id,'how','/haʊ/',5),(u8_id,'which','/wɪtʃ/',6),(u8_id,'how much','/haʊ mʌtʃ/',7),(u8_id,'how many','/haʊ ˈmɛni/',8),(u8_id,'how old','/haʊ oʊld/',9),(u8_id,'because','/bɪˈkɔːz/',10),(u8_id,'answer','/ˈænsər/',11),(u8_id,'question','/ˈkwɛstʃən/',12),(u8_id,'live','/lɪv/',13),(u8_id,'from','/frʌm/',14),(u8_id,'now','/naʊ/',15),(u8_id,'today','/təˈdeɪ/',16),(u8_id,'tomorrow','/təˈmɒroʊ/',17),(u8_id,'yesterday','/ˈjɛstərdeɪ/',18),(u8_id,'country','/ˈkʌntri/',19),
    (u9_id,'in','/ɪn/',0),(u9_id,'on','/ɒn/',1),(u9_id,'at','/æt/',2),(u9_id,'with','/wɪð/',3),(u9_id,'without','/wɪˈðaʊt/',4),(u9_id,'for','/fɔːr/',5),(u9_id,'to','/tuː/',6),(u9_id,'from','/frʌm/',7),(u9_id,'of','/ʌv/',8),(u9_id,'and','/ænd/',9),(u9_id,'but','/bʌt/',10),(u9_id,'or','/ɔːr/',11),(u9_id,'so','/soʊ/',12),(u9_id,'because','/bɪˈkɔːz/',13),(u9_id,'also','/ˈɔːlsoʊ/',14),(u9_id,'too','/tuː/',15),(u9_id,'under','/ˈʌndər/',16),(u9_id,'over','/ˈoʊvər/',17),(u9_id,'between','/bɪˈtwiːn/',18),(u9_id,'near','/nɪər/',19),
    (u10_id,'one','/wʌn/',0),(u10_id,'two','/tuː/',1),(u10_id,'three','/θriː/',2),(u10_id,'four','/fɔːr/',3),(u10_id,'five','/faɪv/',4),(u10_id,'ten','/tɛn/',5),(u10_id,'twenty','/ˈtwɛnti/',6),(u10_id,'hundred','/ˈhʌndrəd/',7),(u10_id,'Monday','/ˈmʌndeɪ/',8),(u10_id,'Tuesday','/ˈtuːzdeɪ/',9),(u10_id,'Wednesday','/ˈwɛnzdeɪ/',10),(u10_id,'Thursday','/ˈθɜːrzdeɪ/',11),(u10_id,'Friday','/ˈfraɪdeɪ/',12),(u10_id,'Saturday','/ˈsætərdeɪ/',13),(u10_id,'Sunday','/ˈsʌndeɪ/',14),(u10_id,'day','/deɪ/',15),(u10_id,'week','/wiːk/',16),(u10_id,'month','/mʌnθ/',17),(u10_id,'year','/jɪər/',18),(u10_id,'o''clock','/əˈklɒk/',19),
    (u11_id,'family','/ˈfæməli/',0),(u11_id,'father','/ˈfɑːðər/',1),(u11_id,'mother','/ˈmʌðər/',2),(u11_id,'dad','/dæd/',3),(u11_id,'mom','/mɒm/',4),(u11_id,'parents','/ˈpɛərənts/',5),(u11_id,'brother','/ˈbrʌðər/',6),(u11_id,'sister','/ˈsɪstər/',7),(u11_id,'son','/sʌn/',8),(u11_id,'daughter','/ˈdɔːtər/',9),(u11_id,'husband','/ˈhʌzbənd/',10),(u11_id,'wife','/waɪf/',11),(u11_id,'uncle','/ˈʌŋkəl/',12),(u11_id,'aunt','/ænt/',13),(u11_id,'cousin','/ˈkʌzən/',14),(u11_id,'grandfather','/ˈɡrænˌfɑːðər/',15),(u11_id,'grandmother','/ˈɡrænˌmʌðər/',16),(u11_id,'baby','/ˈbeɪbi/',17),(u11_id,'child','/tʃaɪld/',18),(u11_id,'children','/ˈtʃɪldrən/',19),
    (u12_id,'like','/laɪk/',0),(u12_id,'love','/lʌv/',1),(u12_id,'hate','/heɪt/',2),(u12_id,'prefer','/prɪˈfɜːr/',3),(u12_id,'enjoy','/ɪnˈdʒɔɪ/',4),(u12_id,'favorite','/ˈfeɪvərɪt/',5),(u12_id,'color','/ˈkʌlər/',6),(u12_id,'food','/fuːd/',7),(u12_id,'movie','/ˈmuːvi/',8),(u12_id,'song','/sɒŋ/',9),(u12_id,'sport','/spɔːrt/',10),(u12_id,'really','/ˈriːəli/',11),(u12_id,'very much','/ˈvɛri mʌtʃ/',12),(u12_id,'a lot','/ə lɒt/',13),(u12_id,'a little','/ə ˈlɪtəl/',14),(u12_id,'at all','/æt ɔːl/',15),(u12_id,'kind of','/kaɪnd ʌv/',16),(u12_id,'pizza','/ˈpiːtsə/',17),(u12_id,'chocolate','/ˈtʃɒkələt/',18),(u12_id,'game','/ɡeɪm/',19);

  INSERT INTO public.spn_straight_to_point (unit_id, title, content_html, sort_order) VALUES
    (u1_id,'Saying Hello','<p>Use <strong>Hello</strong> or <strong>Hi</strong> to greet anyone, any time. By time of day: <em>Good morning, Good afternoon, Good evening</em>.</p>',0),
    (u1_id,'Introducing Yourself','<p><strong>Hi, I am [name]. Nice to meet you.</strong> Short: <em>I''m John.</em></p>',1),
    (u2_id,'Subject Pronouns','<p><strong>I</strong>=eu, <strong>You</strong>=você, <strong>He/She/It</strong>=ele/ela/coisa, <strong>We</strong>=nós, <strong>They</strong>=eles.</p>',0),
    (u2_id,'Using ''it''','<p>Use <strong>it</strong> for objects and animals.</p>',1),
    (u3_id,'To Be — Affirmative','<p><strong>I am, You/We/They are, He/She/It is</strong></p>',0),
    (u3_id,'To Be — Negative','<p>Add <strong>not</strong>: I''m not, isn''t, aren''t.</p>',1),
    (u3_id,'To Be — Questions','<p>Invert: <em>Are you happy? Is he Brazilian?</em></p>',2),
    (u4_id,'Action Verbs','<p>Everyday verbs follow Present Simple. <em>I eat. You drink. We play.</em></p>',0),
    (u4_id,'Combining Verbs','<p><strong>like to</strong> / <strong>want to</strong> + verb. <em>I like to read.</em></p>',1),
    (u5_id,'A vs An','<p><strong>a</strong> before consonants, <strong>an</strong> before vowels.</p>',0),
    (u5_id,'Using ''The''','<p><strong>the</strong> for specific things already known.</p>',1),
    (u6_id,'Possessive Adjectives','<p><strong>my, your, his, her, its, our, their</strong> — always before a noun.</p>',0),
    (u6_id,'His vs Her','<p><strong>his</strong> for male, <strong>her</strong> for female owner.</p>',1),
    (u7_id,'Present Simple — Affirmative','<p>he/she/it: add <strong>-s</strong>. <em>He works. She plays.</em></p>',0),
    (u7_id,'Negative — Don''t / Doesn''t','<p>I/you/we/they: <strong>don''t</strong>. He/she/it: <strong>doesn''t</strong> + base verb.</p>',1),
    (u7_id,'Questions — Do / Does','<p><em>Do you like pizza? Does she work here?</em></p>',2),
    (u8_id,'WH-Question Structure','<p><strong>WH + do/does + subject + verb?</strong></p>',0),
    (u8_id,'Answering with ''because''','<p><em>Why? Because…</em></p>',1),
    (u9_id,'Place: in / on / at','<p><strong>in</strong> dentro, <strong>on</strong> em cima, <strong>at</strong> ponto específico.</p>',0),
    (u9_id,'Connectors','<p><strong>and</strong>, <strong>but</strong>, <strong>or</strong>, <strong>so</strong>, <strong>because</strong>.</p>',1),
    (u10_id,'Telling Time','<p><em>It''s three o''clock. It''s half past four.</em></p>',0),
    (u10_id,'Days of the Week','<p>Capitalized + preposition <strong>on</strong>.</p>',1),
    (u11_id,'Talking about Family','<p>Use possessives: <em>my mother, his sister</em>.</p>',0),
    (u11_id,'Singular vs Plural','<p><em>child → children, person → people</em>.</p>',1),
    (u12_id,'Expressing Likes','<p><strong>I like/love/enjoy</strong> + noun or -ing.</p>',0),
    (u12_id,'Expressing Dislikes','<p><strong>I don''t like / I hate</strong> + noun.</p>',1),
    (u12_id,'Asking','<p><em>Do you like…? What''s your favorite…?</em></p>',2);

  INSERT INTO public.spn_easy_to_understand_items (unit_id, pair_index, side, prompt_html, sort_order) VALUES
    (u1_id,0,'left','<p>Hi, I am Anna.</p>',0),(u1_id,0,'right','<p>Oi, eu sou a Anna.</p>',1),
    (u1_id,1,'left','<p>Nice to meet you.</p>',2),(u1_id,1,'right','<p>Prazer em te conhecer.</p>',3),
    (u1_id,2,'left','<p>Good morning, teacher!</p>',4),(u1_id,2,'right','<p>Bom dia, professor!</p>',5),
    (u1_id,3,'left','<p>Thank you very much.</p>',6),(u1_id,3,'right','<p>Muito obrigado.</p>',7),
    (u1_id,4,'left','<p>Goodbye, see you tomorrow.</p>',8),(u1_id,4,'right','<p>Tchau, até amanhã.</p>',9),
    (u2_id,0,'left','<p>He is my friend.</p>',0),(u2_id,0,'right','<p>Ele é meu amigo.</p>',1),
    (u2_id,1,'left','<p>She is a teacher.</p>',2),(u2_id,1,'right','<p>Ela é professora.</p>',3),
    (u2_id,2,'left','<p>We are students.</p>',4),(u2_id,2,'right','<p>Nós somos estudantes.</p>',5),
    (u2_id,3,'left','<p>They are happy.</p>',6),(u2_id,3,'right','<p>Eles estão felizes.</p>',7),
    (u3_id,0,'left','<p>I am a student.</p>',0),(u3_id,0,'right','<p>Eu sou estudante.</p>',1),
    (u3_id,1,'left','<p>She is not tired.</p>',2),(u3_id,1,'right','<p>Ela não está cansada.</p>',3),
    (u3_id,2,'left','<p>Are you ready?</p>',4),(u3_id,2,'right','<p>Você está pronto?</p>',5),
    (u3_id,3,'left','<p>We are at school.</p>',6),(u3_id,3,'right','<p>Estamos na escola.</p>',7),
    (u4_id,0,'left','<p>I want water.</p>',0),(u4_id,0,'right','<p>Eu quero água.</p>',1),
    (u4_id,1,'left','<p>Do you like pizza?</p>',2),(u4_id,1,'right','<p>Você gosta de pizza?</p>',3),
    (u4_id,2,'left','<p>I need to sleep.</p>',4),(u4_id,2,'right','<p>Eu preciso dormir.</p>',5),
    (u4_id,3,'left','<p>She likes to read books.</p>',6),(u4_id,3,'right','<p>Ela gosta de ler livros.</p>',7),
    (u5_id,0,'left','<p>I want an apple.</p>',0),(u5_id,0,'right','<p>Eu quero uma maçã.</p>',1),
    (u5_id,1,'left','<p>The water is cold.</p>',2),(u5_id,1,'right','<p>A água está fria.</p>',3),
    (u5_id,2,'left','<p>She has a phone.</p>',4),(u5_id,2,'right','<p>Ela tem um telefone.</p>',5),
    (u5_id,3,'left','<p>Open the door, please.</p>',6),(u5_id,3,'right','<p>Abra a porta, por favor.</p>',7),
    (u6_id,0,'left','<p>This is my book.</p>',0),(u6_id,0,'right','<p>Este é meu livro.</p>',1),
    (u6_id,1,'left','<p>What is your name?</p>',2),(u6_id,1,'right','<p>Qual é o seu nome?</p>',3),
    (u6_id,2,'left','<p>Her brother is tall.</p>',4),(u6_id,2,'right','<p>O irmão dela é alto.</p>',5),
    (u6_id,3,'left','<p>Our friends are here.</p>',6),(u6_id,3,'right','<p>Nossos amigos estão aqui.</p>',7),
    (u7_id,0,'left','<p>I work every day.</p>',0),(u7_id,0,'right','<p>Eu trabalho todo dia.</p>',1),
    (u7_id,1,'left','<p>She doesn''t like coffee.</p>',2),(u7_id,1,'right','<p>Ela não gosta de café.</p>',3),
    (u7_id,2,'left','<p>Do you play soccer?</p>',4),(u7_id,2,'right','<p>Você joga futebol?</p>',5),
    (u7_id,3,'left','<p>Does he speak English?</p>',6),(u7_id,3,'right','<p>Ele fala inglês?</p>',7),
    (u8_id,0,'left','<p>Where do you live?</p>',0),(u8_id,0,'right','<p>Onde você mora?</p>',1),
    (u8_id,1,'left','<p>What is your name?</p>',2),(u8_id,1,'right','<p>Qual é o seu nome?</p>',3),
    (u8_id,2,'left','<p>How old are you?</p>',4),(u8_id,2,'right','<p>Quantos anos você tem?</p>',5),
    (u8_id,3,'left','<p>Why are you sad?</p>',6),(u8_id,3,'right','<p>Por que você está triste?</p>',7),
    (u9_id,0,'left','<p>I live in Brazil.</p>',0),(u9_id,0,'right','<p>Eu moro no Brasil.</p>',1),
    (u9_id,1,'left','<p>The book is on the table.</p>',2),(u9_id,1,'right','<p>O livro está em cima da mesa.</p>',3),
    (u9_id,2,'left','<p>I want coffee with milk.</p>',4),(u9_id,2,'right','<p>Quero café com leite.</p>',5),
    (u9_id,3,'left','<p>I''m tired but happy.</p>',6),(u9_id,3,'right','<p>Estou cansado mas feliz.</p>',7),
    (u10_id,0,'left','<p>What time is it?</p>',0),(u10_id,0,'right','<p>Que horas são?</p>',1),
    (u10_id,1,'left','<p>It''s three o''clock.</p>',2),(u10_id,1,'right','<p>São três em ponto.</p>',3),
    (u10_id,2,'left','<p>Today is Monday.</p>',4),(u10_id,2,'right','<p>Hoje é segunda-feira.</p>',5),
    (u10_id,3,'left','<p>See you on Friday.</p>',6),(u10_id,3,'right','<p>A gente se vê na sexta.</p>',7),
    (u11_id,0,'left','<p>This is my family.</p>',0),(u11_id,0,'right','<p>Esta é minha família.</p>',1),
    (u11_id,1,'left','<p>I have two brothers.</p>',2),(u11_id,1,'right','<p>Eu tenho dois irmãos.</p>',3),
    (u11_id,2,'left','<p>Her father is a doctor.</p>',4),(u11_id,2,'right','<p>O pai dela é médico.</p>',5),
    (u11_id,3,'left','<p>They have three children.</p>',6),(u11_id,3,'right','<p>Eles têm três filhos.</p>',7),
    (u12_id,0,'left','<p>I love chocolate.</p>',0),(u12_id,0,'right','<p>Eu amo chocolate.</p>',1),
    (u12_id,1,'left','<p>She doesn''t like coffee.</p>',2),(u12_id,1,'right','<p>Ela não gosta de café.</p>',3),
    (u12_id,2,'left','<p>Do you like pizza?</p>',4),(u12_id,2,'right','<p>Você gosta de pizza?</p>',5),
    (u12_id,3,'left','<p>My favorite color is blue.</p>',6),(u12_id,3,'right','<p>Minha cor favorita é azul.</p>',7);

  INSERT INTO public.spn_exercises (unit_id, kind, prompt_html, correct_answer, hint, sort_order) VALUES
    (u1_id,'fill_blank','<p>___ , I am Mark. (greeting)</p>','hello','Use a common greeting',0),
    (u1_id,'fill_blank','<p>Nice to ___ you.</p>','meet',NULL,1),
    (u1_id,'translate','<p>Translate: <strong>Bom dia</strong></p>','good morning',NULL,2),
    (u1_id,'translate','<p>Translate: <strong>Obrigado</strong></p>','thank you',NULL,3),
    (u2_id,'fill_blank','<p>Mary is here. ___ is my friend.</p>','she',NULL,0),
    (u2_id,'fill_blank','<p>John and I are tired. ___ need a break.</p>','we',NULL,1),
    (u2_id,'translate','<p>Translate: <strong>Eles</strong></p>','they',NULL,2),
    (u3_id,'fill_blank','<p>I ___ a student.</p>','am',NULL,0),
    (u3_id,'fill_blank','<p>She ___ very happy.</p>','is',NULL,1),
    (u3_id,'fill_blank','<p>We ___ Brazilian.</p>','are',NULL,2),
    (u4_id,'fill_blank','<p>I ___ pizza every Friday.</p>','eat',NULL,0),
    (u4_id,'fill_blank','<p>Do you ___ coffee?</p>','drink',NULL,1),
    (u4_id,'translate','<p>Translate: <strong>Eu quero água</strong></p>','i want water',NULL,2),
    (u5_id,'fill_blank','<p>I want ___ orange juice.</p>','an',NULL,0),
    (u5_id,'fill_blank','<p>She has ___ computer.</p>','a',NULL,1),
    (u5_id,'fill_blank','<p>___ door is open.</p>','the',NULL,2),
    (u6_id,'fill_blank','<p>This is ___ phone. (eu)</p>','my',NULL,0),
    (u6_id,'fill_blank','<p>What is ___ name? (você)</p>','your',NULL,1),
    (u6_id,'translate','<p>Translate: <strong>nossa casa</strong></p>','our house',NULL,2),
    (u7_id,'fill_blank','<p>She ___ English very well.</p>','speaks',NULL,0),
    (u7_id,'fill_blank','<p>I ___ like fish.</p>','don''t',NULL,1),
    (u7_id,'fill_blank','<p>He ___ work on Sunday.</p>','doesn''t',NULL,2),
    (u7_id,'fill_blank','<p>___ you like pizza?</p>','do',NULL,3),
    (u8_id,'fill_blank','<p>___ do you live? (cidade)</p>','where',NULL,0),
    (u8_id,'fill_blank','<p>___ is your favorite color?</p>','what',NULL,1),
    (u8_id,'fill_blank','<p>___ old are you?</p>','how',NULL,2),
    (u9_id,'fill_blank','<p>I live ___ São Paulo.</p>','in',NULL,0),
    (u9_id,'fill_blank','<p>The phone is ___ the table.</p>','on',NULL,1),
    (u9_id,'fill_blank','<p>She is ___ work.</p>','at',NULL,2),
    (u9_id,'fill_blank','<p>I want tea ___ sugar.</p>','with',NULL,3),
    (u10_id,'translate','<p>Translate: <strong>sete</strong></p>','seven',NULL,0),
    (u10_id,'translate','<p>Translate: <strong>quinta-feira</strong></p>','thursday',NULL,1),
    (u10_id,'translate','<p>Translate: <strong>Que horas são?</strong></p>','what time is it',NULL,2),
    (u11_id,'translate','<p>Translate: <strong>mãe</strong></p>','mother',NULL,0),
    (u11_id,'translate','<p>Translate: <strong>irmão</strong></p>','brother',NULL,1),
    (u11_id,'translate','<p>Translate: <strong>avô</strong></p>','grandfather',NULL,2),
    (u11_id,'fill_blank','<p>I have two ___ . (crianças)</p>','children',NULL,3),
    (u12_id,'translate','<p>Translate: <strong>Eu amo pizza</strong></p>','i love pizza',NULL,0),
    (u12_id,'fill_blank','<p>My ___ color is red.</p>','favorite',NULL,1),
    (u12_id,'fill_blank','<p>Do you ___ soccer?</p>','like',NULL,2);
END $$;