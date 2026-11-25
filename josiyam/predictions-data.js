/*!
 * Josiyam · predictions-data.js
 * Bilingual (English / தமிழ்) knowledge base: names, panchangam terms, interface text and the
 * Jathaga Sastra readings used by sastra-engine.js. Grounded in Brihat Parashara Hora Shastra,
 * Phaladeepika and common Tamil Jathaga practice, written in plain modern language.
 * Placeholders in templates: {p} planet, {h} house number, {s} sign, {x} free value.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.JosiyamData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const K = {};

  /* ================================================================ NAMES */
  K.rasi = [
    { en: 'Aries', sa: 'Mesham', ta: 'மேஷம்', taLoc: 'மேஷத்தில்', taAdj: 'மேஷ', el: 0 },
    { en: 'Taurus', sa: 'Rishabam', ta: 'ரிஷபம்', taLoc: 'ரிஷபத்தில்', taAdj: 'ரிஷப', el: 1 },
    { en: 'Gemini', sa: 'Mithunam', ta: 'மிதுனம்', taLoc: 'மிதுனத்தில்', taAdj: 'மிதுன', el: 2 },
    { en: 'Cancer', sa: 'Kadagam', ta: 'கடகம்', taLoc: 'கடகத்தில்', taAdj: 'கடக', el: 3 },
    { en: 'Leo', sa: 'Simmam', ta: 'சிம்மம்', taLoc: 'சிம்மத்தில்', taAdj: 'சிம்ம', el: 0 },
    { en: 'Virgo', sa: 'Kanni', ta: 'கன்னி', taLoc: 'கன்னியில்', taAdj: 'கன்னி', el: 1 },
    { en: 'Libra', sa: 'Thulam', ta: 'துலாம்', taLoc: 'துலாத்தில்', taAdj: 'துலா', el: 2 },
    { en: 'Scorpio', sa: 'Viruchigam', ta: 'விருச்சிகம்', taLoc: 'விருச்சிகத்தில்', taAdj: 'விருச்சிக', el: 3 },
    { en: 'Sagittarius', sa: 'Dhanusu', ta: 'தனுசு', taLoc: 'தனுசில்', taAdj: 'தனுசு', el: 0 },
    { en: 'Capricorn', sa: 'Magaram', ta: 'மகரம்', taLoc: 'மகரத்தில்', taAdj: 'மகர', el: 1 },
    { en: 'Aquarius', sa: 'Kumbam', ta: 'கும்பம்', taLoc: 'கும்பத்தில்', taAdj: 'கும்ப', el: 2 },
    { en: 'Pisces', sa: 'Meenam', ta: 'மீனம்', taLoc: 'மீனத்தில்', taAdj: 'மீன', el: 3 }
  ];
  K.signAbbr = { en: ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'], ta: ['மேஷ', 'ரிஷ', 'மிது', 'கட', 'சிம்', 'கன்', 'துலா', 'விரு', 'தனு', 'மகர', 'கும்', 'மீன'] };

  K.planet = {
    Lagna: { en: 'Lagna (Ascendant)', ta: 'லக்னம்', ab: { en: 'Asc', ta: 'லக்' }, short: { en: 'Lagna', ta: 'லக்னம்' } },
    Sun: { en: 'Sun', sa: 'Surya', ta: 'சூரியன்', taGen: 'சூரியனின்', ab: { en: 'Su', ta: 'சூரி' }, dasha: { en: 'Sun', ta: 'சூரிய' } },
    Moon: { en: 'Moon', sa: 'Chandra', ta: 'சந்திரன்', taGen: 'சந்திரனின்', ab: { en: 'Mo', ta: 'சந்திரன்' }, dasha: { en: 'Moon', ta: 'சந்திர' } },
    Mars: { en: 'Mars', sa: 'Chevvai / Kuja', ta: 'செவ்வாய்', taGen: 'செவ்வாயின்', ab: { en: 'Ma', ta: 'செவ்' }, dasha: { en: 'Mars', ta: 'செவ்வாய்' } },
    Mercury: { en: 'Mercury', sa: 'Budha', ta: 'புதன்', taGen: 'புதனின்', ab: { en: 'Me', ta: 'புத' }, dasha: { en: 'Mercury', ta: 'புதன்' } },
    Jupiter: { en: 'Jupiter', sa: 'Guru', ta: 'குரு', taGen: 'குருவின்', ab: { en: 'Ju', ta: 'குரு' }, dasha: { en: 'Jupiter', ta: 'குரு' } },
    Venus: { en: 'Venus', sa: 'Sukra', ta: 'சுக்கிரன்', taGen: 'சுக்கிரனின்', ab: { en: 'Ve', ta: 'சுக்' }, dasha: { en: 'Venus', ta: 'சுக்கிர' } },
    Saturn: { en: 'Saturn', sa: 'Sani', ta: 'சனி', taGen: 'சனியின்', ab: { en: 'Sa', ta: 'சனி' }, dasha: { en: 'Saturn', ta: 'சனி' } },
    Rahu: { en: 'Rahu', sa: 'Rahu', ta: 'ராகு', taGen: 'ராகுவின்', ab: { en: 'Ra', ta: 'ராகு' }, dasha: { en: 'Rahu', ta: 'ராகு' } },
    Ketu: { en: 'Ketu', sa: 'Ketu', ta: 'கேது', taGen: 'கேதுவின்', ab: { en: 'Ke', ta: 'கேது' }, dasha: { en: 'Ketu', ta: 'கேது' } }
  };

  K.nakshatra = [
    { en: 'Ashwini', ta: 'அசுவினி' }, { en: 'Bharani', ta: 'பரணி' }, { en: 'Krittika', ta: 'கார்த்திகை' },
    { en: 'Rohini', ta: 'ரோகிணி' }, { en: 'Mrigashirsha', ta: 'மிருகசீரிடம்' }, { en: 'Ardra', ta: 'திருவாதிரை' },
    { en: 'Punarvasu', ta: 'புனர்பூசம்' }, { en: 'Pushya', ta: 'பூசம்' }, { en: 'Ashlesha', ta: 'ஆயில்யம்' },
    { en: 'Magha', ta: 'மகம்' }, { en: 'Purva Phalguni', ta: 'பூரம்' }, { en: 'Uttara Phalguni', ta: 'உத்திரம்' },
    { en: 'Hasta', ta: 'அஸ்தம்' }, { en: 'Chitra', ta: 'சித்திரை' }, { en: 'Swati', ta: 'சுவாதி' },
    { en: 'Vishakha', ta: 'விசாகம்' }, { en: 'Anuradha', ta: 'அனுஷம்' }, { en: 'Jyeshtha', ta: 'கேட்டை' },
    { en: 'Mula', ta: 'மூலம்' }, { en: 'Purva Ashadha', ta: 'பூராடம்' }, { en: 'Uttara Ashadha', ta: 'உத்திராடம்' },
    { en: 'Shravana', ta: 'திருவோணம்' }, { en: 'Dhanishta', ta: 'அவிட்டம்' }, { en: 'Shatabhisha', ta: 'சதயம்' },
    { en: 'Purva Bhadrapada', ta: 'பூரட்டாதி' }, { en: 'Uttara Bhadrapada', ta: 'உத்திரட்டாதி' }, { en: 'Revati', ta: 'ரேவதி' }
  ];
  // Gana: D Deva, M Manushya, R Rakshasa · Yoni: [animal, gender]
  K.nakGana = 'DMRMDMDDRRMMDRDRDRRMMDRRMMD'.split('');
  K.nakYoni = [
    ['horse', 'm'], ['elephant', 'm'], ['sheep', 'f'], ['serpent', 'm'], ['serpent', 'f'], ['dog', 'f'], ['cat', 'f'],
    ['sheep', 'm'], ['cat', 'm'], ['rat', 'm'], ['rat', 'f'], ['cow', 'm'], ['buffalo', 'f'], ['tiger', 'f'],
    ['buffalo', 'm'], ['tiger', 'm'], ['deer', 'f'], ['deer', 'm'], ['dog', 'm'], ['monkey', 'm'], ['mongoose', 'm'],
    ['monkey', 'f'], ['lion', 'f'], ['horse', 'f'], ['lion', 'm'], ['cow', 'f'], ['elephant', 'f']
  ];
  // Nadi follows the zig-zag Adi, Madhya, Antya, Antya, Madhya, Adi …
  K.nakNadi = Array.from({ length: 27 }, (_, i) => [0, 1, 2, 2, 1, 0][i % 6]);

  K.gana = {
    D: { en: 'Deva gana', ta: 'தேவ கணம்' }, M: { en: 'Manushya gana', ta: 'மனுஷ கணம்' }, R: { en: 'Rakshasa gana', ta: 'ராட்சச கணம்' }
  };
  K.yoni = {
    horse: { en: 'Horse', ta: 'குதிரை' }, elephant: { en: 'Elephant', ta: 'யானை' }, sheep: { en: 'Sheep', ta: 'ஆடு' },
    serpent: { en: 'Serpent', ta: 'பாம்பு' }, dog: { en: 'Dog', ta: 'நாய்' }, cat: { en: 'Cat', ta: 'பூனை' },
    rat: { en: 'Rat', ta: 'எலி' }, cow: { en: 'Cow', ta: 'பசு' }, buffalo: { en: 'Buffalo', ta: 'எருமை' },
    tiger: { en: 'Tiger', ta: 'புலி' }, deer: { en: 'Deer', ta: 'மான்' }, monkey: { en: 'Monkey', ta: 'குரங்கு' },
    mongoose: { en: 'Mongoose', ta: 'கீரி' }, lion: { en: 'Lion', ta: 'சிங்கம்' }
  };
  K.gender = { m: { en: 'male', ta: 'ஆண்' }, f: { en: 'female', ta: 'பெண்' } };
  K.nadi = [
    { en: 'Adi nadi (Vata)', ta: 'ஆதி நாடி (வாதம்)' },
    { en: 'Madhya nadi (Pitta)', ta: 'மத்திய நாடி (பித்தம்)' },
    { en: 'Antya nadi (Kapha)', ta: 'அந்திய நாடி (கபம்)' }
  ];
  K.element = [
    { en: 'Fire (Agni)', ta: 'நெருப்பு (அக்னி)' }, { en: 'Earth (Prithvi)', ta: 'நிலம் (பிருத்வி)' },
    { en: 'Air (Vayu)', ta: 'காற்று (வாயு)' }, { en: 'Water (Jala)', ta: 'நீர் (ஜலம்)' }
  ];

  K.tithi = [
    { en: 'Prathama', ta: 'பிரதமை' }, { en: 'Dwitiya', ta: 'துவிதியை' }, { en: 'Tritiya', ta: 'திருதியை' },
    { en: 'Chaturthi', ta: 'சதுர்த்தி' }, { en: 'Panchami', ta: 'பஞ்சமி' }, { en: 'Shashti', ta: 'சஷ்டி' },
    { en: 'Saptami', ta: 'சப்தமி' }, { en: 'Ashtami', ta: 'அஷ்டமி' }, { en: 'Navami', ta: 'நவமி' },
    { en: 'Dashami', ta: 'தசமி' }, { en: 'Ekadashi', ta: 'ஏகாதசி' }, { en: 'Dwadashi', ta: 'துவாதசி' },
    { en: 'Trayodashi', ta: 'திரயோதசி' }, { en: 'Chaturdashi', ta: 'சதுர்த்தசி' }, { en: 'Pournami', ta: 'பௌர்ணமி' }
  ];
  K.amavasya = { en: 'Amavasya', ta: 'அமாவாசை' };
  K.paksha = { shukla: { en: 'Shukla paksha (waxing)', ta: 'வளர்பிறை' }, krishna: { en: 'Krishna paksha (waning)', ta: 'தேய்பிறை' } };
  K.yoga = [
    { en: 'Vishkambha', ta: 'விஷ்கம்பம்' }, { en: 'Priti', ta: 'ப்ரீதி' }, { en: 'Ayushman', ta: 'ஆயுஷ்மான்' },
    { en: 'Saubhagya', ta: 'சௌபாக்கியம்' }, { en: 'Shobhana', ta: 'சோபனம்' }, { en: 'Atiganda', ta: 'அதிகண்டம்' },
    { en: 'Sukarma', ta: 'சுகர்மம்' }, { en: 'Dhriti', ta: 'திருதி' }, { en: 'Shula', ta: 'சூலம்' },
    { en: 'Ganda', ta: 'கண்டம்' }, { en: 'Vriddhi', ta: 'விருத்தி' }, { en: 'Dhruva', ta: 'துருவம்' },
    { en: 'Vyaghata', ta: 'வியாகாதம்' }, { en: 'Harshana', ta: 'ஹர்ஷணம்' }, { en: 'Vajra', ta: 'வஜ்ரம்' },
    { en: 'Siddhi', ta: 'சித்தி' }, { en: 'Vyatipata', ta: 'வியதீபாதம்' }, { en: 'Variyana', ta: 'வரியான்' },
    { en: 'Parigha', ta: 'பரிகம்' }, { en: 'Shiva', ta: 'சிவம்' }, { en: 'Siddha', ta: 'சித்தம்' },
    { en: 'Sadhya', ta: 'சாத்தியம்' }, { en: 'Shubha', ta: 'சுபம்' }, { en: 'Shukla', ta: 'சுக்லம்' },
    { en: 'Brahma', ta: 'பிரம்மம்' }, { en: 'Indra', ta: 'ஐந்திரம்' }, { en: 'Vaidhriti', ta: 'வைதிருதி' }
  ];
  K.karana = [
    { en: 'Bava', ta: 'பவம்' }, { en: 'Balava', ta: 'பாலவம்' }, { en: 'Kaulava', ta: 'கௌலவம்' },
    { en: 'Taitila', ta: 'தைதுலம்' }, { en: 'Gara', ta: 'கரசை' }, { en: 'Vanija', ta: 'வணிசை' },
    { en: 'Vishti (Bhadra)', ta: 'பத்திரை (விஷ்டி)' }, { en: 'Shakuni', ta: 'சகுனி' }, { en: 'Chatushpada', ta: 'சதுஷ்பாதம்' },
    { en: 'Naga', ta: 'நாகவம்' }, { en: 'Kimstughna', ta: 'கிம்ஸ்துக்கினம்' }
  ];
  K.weekday = [
    { en: 'Sunday', ta: 'ஞாயிற்றுக்கிழமை' }, { en: 'Monday', ta: 'திங்கட்கிழமை' }, { en: 'Tuesday', ta: 'செவ்வாய்க்கிழமை' },
    { en: 'Wednesday', ta: 'புதன்கிழமை' }, { en: 'Thursday', ta: 'வியாழக்கிழமை' }, { en: 'Friday', ta: 'வெள்ளிக்கிழமை' },
    { en: 'Saturday', ta: 'சனிக்கிழமை' }
  ];
  K.weekdayShort = { en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], ta: ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'] };
  K.tamilMonth = [
    { en: 'Chithirai', ta: 'சித்திரை' }, { en: 'Vaikasi', ta: 'வைகாசி' }, { en: 'Aani', ta: 'ஆனி' },
    { en: 'Aadi', ta: 'ஆடி' }, { en: 'Aavani', ta: 'ஆவணி' }, { en: 'Purattasi', ta: 'புரட்டாசி' },
    { en: 'Aippasi', ta: 'ஐப்பசி' }, { en: 'Karthigai', ta: 'கார்த்திகை' }, { en: 'Margazhi', ta: 'மார்கழி' },
    { en: 'Thai', ta: 'தை' }, { en: 'Maasi', ta: 'மாசி' }, { en: 'Panguni', ta: 'பங்குனி' }
  ];
  K.monthEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  K.monthTa = ['ஜன', 'பிப்', 'மார்', 'ஏப்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆக', 'செப்', 'அக்', 'நவ', 'டிச'];
  K.tamilYear = [
    ['Prabhava', 'பிரபவ'], ['Vibhava', 'விபவ'], ['Sukla', 'சுக்ல'], ['Pramodhootha', 'பிரமோதூத'], ['Prajorpathi', 'பிரஜோத்பத்தி'],
    ['Aangirasa', 'ஆங்கீரச'], ['Srimukha', 'ஸ்ரீமுக'], ['Bhava', 'பவ'], ['Yuva', 'யுவ'], ['Dhaathu', 'தாது'],
    ['Eswara', 'ஈஸ்வர'], ['Vegudhanya', 'வெகுதானிய'], ['Pramathi', 'பிரமாதி'], ['Vikrama', 'விக்கிரம'], ['Vishu', 'விஷு'],
    ['Chitrabhanu', 'சித்திரபானு'], ['Subhanu', 'சுபானு'], ['Thaarana', 'தாரண'], ['Parthiba', 'பார்த்திப'], ['Viya', 'விய'],
    ['Sarvajith', 'சர்வஜித்'], ['Sarvadhari', 'சர்வதாரி'], ['Virodhi', 'விரோதி'], ['Vikruthi', 'விக்ருதி'], ['Kara', 'கர'],
    ['Nandhana', 'நந்தன'], ['Vijaya', 'விஜய'], ['Jaya', 'ஜய'], ['Manmatha', 'மன்மத'], ['Dhunmukhi', 'துன்முகி'],
    ['Hevilambi', 'ஹேவிளம்பி'], ['Vilambi', 'விளம்பி'], ['Vikari', 'விகாரி'], ['Sarvari', 'சார்வரி'], ['Plava', 'பிலவ'],
    ['Subakrith', 'சுபகிருது'], ['Sobakrith', 'சோபகிருது'], ['Krodhi', 'குரோதி'], ['Visuvasu', 'விசுவாவசு'], ['Parabhava', 'பராபவ'],
    ['Plavanga', 'பிலவங்க'], ['Keelaka', 'கீலக'], ['Saumya', 'சௌமிய'], ['Sadharana', 'சாதாரண'], ['Virodhikrith', 'விரோதகிருது'],
    ['Paridhaabi', 'பரிதாபி'], ['Pramadheesa', 'பிரமாதீச'], ['Aanandha', 'ஆனந்த'], ['Rakshasa', 'ராட்சச'], ['Nala', 'நள'],
    ['Pingala', 'பிங்கள'], ['Kalayukthi', 'காளயுக்தி'], ['Siddharthi', 'சித்தார்த்தி'], ['Raudhri', 'ரௌத்திரி'], ['Dhunmathi', 'துன்மதி'],
    ['Dhundhubhi', 'துந்துபி'], ['Rudhrodhgaari', 'ருத்ரோத்காரி'], ['Raktakshi', 'ரக்தாட்சி'], ['Krodhana', 'குரோதன'], ['Akshaya', 'அட்சய']
  ].map(([en, ta]) => ({ en, ta }));

  K.dignity = {
    exalted: { en: 'Exalted (Ucham)', ta: 'உச்சம்', short: { en: 'Ucham', ta: 'உச்சம்' } },
    moolatrikona: { en: 'Moolatrikona', ta: 'மூலத்திரிகோணம்', short: { en: 'Moola', ta: 'மூலத்' } },
    own: { en: 'Own sign (Aatchi)', ta: 'ஆட்சி', short: { en: 'Aatchi', ta: 'ஆட்சி' } },
    friend: { en: 'Friendly sign (Natpu)', ta: 'நட்பு', short: { en: 'Friend', ta: 'நட்பு' } },
    neutral: { en: 'Neutral sign (Samam)', ta: 'சமம்', short: { en: 'Neutral', ta: 'சமம்' } },
    enemy: { en: 'Enemy sign (Pagai)', ta: 'பகை', short: { en: 'Enemy', ta: 'பகை' } },
    debilitated: { en: 'Debilitated (Neecham)', ta: 'நீசம்', short: { en: 'Neecham', ta: 'நீசம்' } }
  };
  K.role = {
    yogakaraka: { en: 'Yogakaraka', ta: 'யோககாரகன்' },
    benefic: { en: 'Functional benefic', ta: 'சுபர் (இந்த லக்னத்திற்கு)' },
    neutral: { en: 'Neutral', ta: 'சமர்' },
    malefic: { en: 'Functional malefic', ta: 'பாபர் (இந்த லக்னத்திற்கு)' },
    maraka: { en: 'Maraka', ta: 'மாரகர்' }
  };
  K.natural = { benefic: { en: 'natural benefic', ta: 'இயற்கை சுபர்' }, malefic: { en: 'natural malefic', ta: 'இயற்கை பாபர்' } };

  K.house = [
    { en: 'self, body and personality', ta: 'உடல், தோற்றம், சுயம்', name: { en: 'Lagna (Tanu bhava)', ta: 'லக்னம் (தனு ஸ்தானம்)' } },
    { en: 'family, wealth, speech and food', ta: 'குடும்பம், தனம், வாக்கு', name: { en: 'Dhana bhava', ta: 'தன ஸ்தானம்' } },
    { en: 'courage, siblings, effort and communication', ta: 'தைரியம், சகோதரர், முயற்சி', name: { en: 'Sahaja bhava', ta: 'சகோதர / தைரிய ஸ்தானம்' } },
    { en: 'home, mother, property, vehicles and peace of mind', ta: 'வீடு, தாய், சொத்து, வாகனம், மன அமைதி', name: { en: 'Sukha bhava', ta: 'சுக / மாத்ரு ஸ்தானம்' } },
    { en: 'intelligence, children, creativity and past merit', ta: 'புத்தி, குழந்தைகள், பூர்வ புண்ணியம்', name: { en: 'Putra bhava', ta: 'பூர்வ புண்ணிய / புத்திர ஸ்தானம்' } },
    { en: 'health, debts, rivals and service', ta: 'நோய், கடன், எதிரி, சேவை', name: { en: 'Ripu bhava', ta: 'ருண ரோக சத்ரு ஸ்தானம்' } },
    { en: 'marriage, partners and public dealings', ta: 'திருமணம், வாழ்க்கைத் துணை, கூட்டாளி', name: { en: 'Kalatra bhava', ta: 'களத்திர ஸ்தானம்' } },
    { en: 'longevity, sudden events, research and inheritance', ta: 'ஆயுள், திடீர் மாற்றம், ஆராய்ச்சி, பரம்பரைச் சொத்து', name: { en: 'Ayur bhava', ta: 'ஆயுள் ஸ்தானம்' } },
    { en: 'fortune, father, dharma, teachers and long journeys', ta: 'பாக்கியம், தந்தை, தர்மம், குரு, தூரப் பயணம்', name: { en: 'Bhagya bhava', ta: 'பாக்கிய / பித்ரு ஸ்தானம்' } },
    { en: 'career, status and actions', ta: 'தொழில், அந்தஸ்து, கர்மம்', name: { en: 'Karma bhava', ta: 'ஜீவன / கர்ம ஸ்தானம்' } },
    { en: 'gains, income, friends and fulfilment of wishes', ta: 'லாபம், வருமானம், நண்பர்கள், ஆசைகள் நிறைவேறுதல்', name: { en: 'Labha bhava', ta: 'லாப ஸ்தானம்' } },
    { en: 'expenses, foreign lands, sleep and liberation', ta: 'செலவு, வெளிநாடு, உறக்கம், மோட்சம்', name: { en: 'Vyaya bhava', ta: 'விரய / மோட்ச ஸ்தானம்' } }
  ];

  // Per-planet attributes used for lucky factors and remedies
  K.luck = {
    Sun: { num: 1, color: { en: 'red, orange, gold', ta: 'சிவப்பு, ஆரஞ்சு, பொன்னிறம்' }, day: 0, gem: { en: 'Ruby', ta: 'மாணிக்கம்' } },
    Moon: { num: 2, color: { en: 'white, silver, cream', ta: 'வெண்மை, வெள்ளி நிறம்' }, day: 1, gem: { en: 'Pearl', ta: 'முத்து' } },
    Mars: { num: 9, color: { en: 'red, coral', ta: 'சிவப்பு, பவள நிறம்' }, day: 2, gem: { en: 'Red coral', ta: 'பவளம்' } },
    Mercury: { num: 5, color: { en: 'green', ta: 'பச்சை' }, day: 3, gem: { en: 'Emerald', ta: 'மரகதம்' } },
    Jupiter: { num: 3, color: { en: 'yellow, gold', ta: 'மஞ்சள், பொன்னிறம்' }, day: 4, gem: { en: 'Yellow sapphire', ta: 'புஷ்பராகம்' } },
    Venus: { num: 6, color: { en: 'white, pink, light blue', ta: 'வெண்மை, இளஞ்சிவப்பு, வெளிர் நீலம்' }, day: 5, gem: { en: 'Diamond', ta: 'வைரம்' } },
    Saturn: { num: 8, color: { en: 'dark blue, black', ta: 'கருநீலம், கருப்பு' }, day: 6, gem: { en: 'Blue sapphire', ta: 'நீலக்கல்' } },
    Rahu: { num: 4, color: { en: 'smoky grey, navy', ta: 'புகை நிறம், கருநீலம்' }, day: 6, gem: { en: 'Hessonite', ta: 'கோமேதகம்' } },
    Ketu: { num: 7, color: { en: 'brown, mixed colours', ta: 'பழுப்பு, பல வண்ணம்' }, day: 2, gem: { en: 'Cat’s eye', ta: 'வைடூரியம்' } }
  };

  /* ================================================================ INTERFACE TEXT */
  K.ui = {
    pageTitle: { en: 'Thudinest Josiyam — South Indian Jathagam (Thirukanitham)', ta: 'துடிநெஸ்ட் ஜோசியம் — தென்னிந்திய ஜாதகம் (திருக்கணிதம்)' },
    brand: { en: 'Thudinest Josiyam', ta: 'துடிநெஸ்ட் ஜோசியம்' },
    navChart: { en: 'Chart', ta: 'கட்டம்' }, navReport: { en: 'Palan', ta: 'பலன்' }, navDasha: { en: 'Dasha', ta: 'தசை' },
    langLabel: { en: 'Language', ta: 'மொழி' },
    heroKicker: { en: 'Thirukanitham · Lahiri ayanamsa', ta: 'திருக்கணிதம் · லகிரி அயனாம்சம்' },
    heroTitle: { en: 'Your Jathagam, written in the stars', ta: 'விண்மீன்கள் எழுதும் உங்கள் ஜாதகம்' },
    heroSub: { en: 'South Indian Rasi and Navamsam charts, Vimshottari dasha and classical Sastra readings, calculated in your browser.', ta: 'தென்னிந்திய ராசி, நவாம்ச கட்டங்கள், விம்சோத்தரி தசை, சாஸ்திர பலன்கள் — அனைத்தும் உங்கள் உலாவியிலேயே கணிக்கப்படுகின்றன.' },
    heroPoint1: { en: 'Swiss-ephemeris-grade positions', ta: 'துல்லியமான கிரக நிலைகள்' },
    heroPoint2: { en: 'English and Tamil', ta: 'ஆங்கிலம் மற்றும் தமிழ்' },
    heroPoint3: { en: 'Nothing leaves your device', ta: 'உங்கள் விவரங்கள் வெளியே செல்லாது' },
    formTitle: { en: 'Birth details', ta: 'பிறப்பு விவரங்கள்' },
    name: { en: 'Name', ta: 'பெயர்' }, namePh: { en: 'Optional', ta: 'விருப்பத்திற்கு' },
    gender: { en: 'Gender', ta: 'பாலினம்' }, male: { en: 'Male', ta: 'ஆண்' }, female: { en: 'Female', ta: 'பெண்' }, other: { en: 'Other', ta: 'மற்றவை' },
    dob: { en: 'Date of birth', ta: 'பிறந்த தேதி' },
    tob: { en: 'Time of birth', ta: 'பிறந்த நேரம்' },
    hour: { en: 'Hour', ta: 'மணி' }, minute: { en: 'Minute', ta: 'நிமிடம்' },
    am: { en: 'AM', ta: 'முற்பகல்' }, pm: { en: 'PM', ta: 'பிற்பகல்' }, h24: { en: '24-hour', ta: '24 மணி' },
    place: { en: 'Place of birth', ta: 'பிறந்த ஊர்' },
    placePh: { en: 'Start typing a town or city…', ta: 'ஊரின் பெயரை தட்டச்சு செய்யவும்…' },
    searchWorld: { en: 'Search worldwide for “{x}”', ta: '“{x}” — உலகம் முழுவதும் தேடு' },
    searching: { en: 'Searching OpenStreetMap…', ta: 'OpenStreetMap-இல் தேடுகிறது…' },
    noPlace: { en: 'No match. Try another spelling or enter coordinates manually.', ta: 'பொருத்தம் இல்லை. வேறு எழுத்துக்கூட்டலில் முயலவும் அல்லது அட்ச தீர்க்க ரேகையை நேரடியாக இடவும்.' },
    netError: { en: 'Online search is unavailable right now. Pick from the list or enter coordinates manually.', ta: 'இணையத் தேடல் தற்போது இயலவில்லை. பட்டியலில் இருந்து தேர்ந்தெடுக்கவும் அல்லது நேரடியாக இடவும்.' },
    manual: { en: 'Enter latitude, longitude and time zone manually', ta: 'அட்சரேகை, தீர்க்கரேகை, நேர மண்டலத்தை நேரடியாக இடு' },
    lat: { en: 'Latitude (°N +, °S −)', ta: 'அட்சரேகை (வடக்கு +, தெற்கு −)' },
    lon: { en: 'Longitude (°E +, °W −)', ta: 'தீர்க்கரேகை (கிழக்கு +, மேற்கு −)' },
    tzMode: { en: 'Time zone', ta: 'நேர மண்டலம்' },
    tzAuto: { en: 'From the coordinates (historical rules)', ta: 'இருப்பிடத்தின் படி (வரலாற்று விதிகளுடன்)' },
    tzFixed: { en: 'Fixed UTC offset', ta: 'நிலையான UTC வேறுபாடு' },
    tzOffset: { en: 'UTC offset', ta: 'UTC வேறுபாடு' },
    resolved: { en: '{x}', ta: '{x}' },
    offsetAtBirth: { en: 'UTC{x} at birth', ta: 'பிறப்பின்போது UTC{x}' },
    advanced: { en: 'Calculation settings', ta: 'கணித அமைப்புகள்' },
    nodeType: { en: 'Rahu / Ketu', ta: 'ராகு / கேது' },
    nodeMean: { en: 'Mean node', ta: 'சராசரி (Mean)' }, nodeTrue: { en: 'True node', ta: 'உண்மை (True)' },
    ayanamsaFixed: { en: 'Ayanamsa: Lahiri (Chitrapaksha)', ta: 'அயனாம்சம்: லகிரி (சித்ரபக்ஷ)' },
    generate: { en: 'Cast my Jathagam', ta: 'ஜாதகம் கணி' },
    sample: { en: 'Load sample chart', ta: 'மாதிரி ஜாதகம்' },
    sampleName: { en: 'Sample (Coimbatore)', ta: 'மாதிரி (கோயம்புத்தூர்)' },
    privacy: { en: 'Calculated on your device. Only the optional worldwide place search contacts OpenStreetMap.', ta: 'கணக்கீடு உங்கள் சாதனத்திலேயே நடக்கிறது. உலகளாவிய ஊர் தேடல் மட்டும் OpenStreetMap-ஐ அணுகும்.' },
    errDate: { en: 'Enter a valid date of birth between 1800 and 2100.', ta: '1800 முதல் 2100 வரையிலான சரியான பிறந்த தேதியை இடவும்.' },
    errTime: { en: 'Enter a valid time of birth.', ta: 'சரியான பிறந்த நேரத்தை இடவும்.' },
    errPlace: { en: 'Choose a place from the list, or enter coordinates manually.', ta: 'பட்டியலில் இருந்து ஊரைத் தேர்ந்தெடுக்கவும், அல்லது அட்ச தீர்க்க ரேகையை இடவும்.' },
    errLatLon: { en: 'Latitude must be between −90 and 90 and longitude between −180 and 180.', ta: 'அட்சரேகை −90 முதல் 90 வரை, தீர்க்கரேகை −180 முதல் 180 வரை இருக்க வேண்டும்.' },
    errTz: { en: 'Enter a UTC offset such as +05:30.', ta: '+05:30 போன்ற UTC வேறுபாட்டை இடவும்.' },
    errCalc: { en: 'The calculation could not be completed. Please check the details.', ta: 'கணக்கீட்டை முடிக்க இயலவில்லை. விவரங்களைச் சரிபார்க்கவும்.' },
    calculating: { en: 'Calculating…', ta: 'கணிக்கிறது…' },

    chartsTitle: { en: 'Rasi & Navamsam', ta: 'ராசி & நவாம்சம்' },
    rasiChart: { en: 'Rasi chart (D1)', ta: 'ராசி கட்டம்' },
    navamsaChart: { en: 'Navamsam chart (D9)', ta: 'நவாம்ச கட்டம்' },
    rasiCenter: { en: 'Rasi', ta: 'ராசி' },
    navamsaCenter: { en: 'Navamsam', ta: 'நவாம்சம்' },
    chartHint: { en: 'Tap or hover over a planet or a house to see its lord, degree, star and aspects.', ta: 'ஒரு கிரகம் அல்லது கட்டத்தைத் தொட்டால் அதன் அதிபதி, பாகை, நட்சத்திரம், பார்வைகள் தெரியும்.' },
    janmaNak: { en: 'Star', ta: 'நட்சத்திரம்' }, janmaRasi: { en: 'Rasi', ta: 'ராசி' }, lagna: { en: 'Lagna', ta: 'லக்னம்' },
    pada: { en: 'pada', ta: 'பாதம்' },
    dashaNow: { en: 'Running', ta: 'நடப்பு' },
    ayanamsa: { en: 'Ayanamsa', ta: 'அயனாம்சம்' },
    ayanamsaName: { en: 'Thirukanitham (Lahiri)', ta: 'திருக்கணிதம் (லகிரி)' },
    born: { en: 'Born', ta: 'பிறப்பு' },
    print: { en: 'Print / Save as PDF', ta: 'அச்சிடு / PDF ஆக சேமி' },
    share: { en: 'Copy link', ta: 'இணைப்பை நகலெடு' },
    copied: { en: 'Link copied', ta: 'இணைப்பு நகலெடுக்கப்பட்டது' },
    edit: { en: 'Edit details', ta: 'விவரங்களை மாற்று' },
    jathagamSheet: { en: 'Jathagam', ta: 'ஜாதகம்' },

    inspPlanet: { en: '{p} in {s}', ta: '{sl} {p}' },
    inspHouse: { en: 'House {h} · {s}', ta: '{h}-ஆம் வீடு · {s}' },
    inspLord: { en: 'Lord', ta: 'அதிபதி' },
    inspLordAt: { en: '{p} in house {h} ({s})', ta: '{p}, {h}-ஆம் வீட்டில் ({s})' },
    inspDegree: { en: 'Degree', ta: 'பாகை' },
    inspStar: { en: 'Nakshatra', ta: 'நட்சத்திரம்' },
    inspStarLord: { en: 'Star lord', ta: 'நட்சத்திர அதிபதி' },
    inspAspects: { en: 'Aspects (drishti) on', ta: 'பார்வை செலுத்தும் வீடுகள்' },
    inspAspectedBy: { en: 'Aspected by', ta: 'பார்க்கும் கிரகங்கள்' },
    inspOccupants: { en: 'Occupants', ta: 'இருக்கும் கிரகங்கள்' },
    inspHouseFromLagna: { en: 'House from Lagna', ta: 'லக்னத்திலிருந்து வீடு' },
    inspNodeNote: { en: 'Rahu/Ketu aspects: only the 7th is used here; traditions differ.', ta: 'ராகு/கேது பார்வை: இங்கு 7-ஆம் பார்வை மட்டும் கணக்கில்; மரபுகள் வேறுபடும்.' },
    none: { en: 'None', ta: 'இல்லை' },
    houseN: { en: 'house {h}', ta: '{h}-ஆம் வீடு' },

    planetTable: { en: 'Graha positions', ta: 'கிரக நிலைகள்' },
    thGraha: { en: 'Graha', ta: 'கிரகம்' }, thRasi: { en: 'Rasi', ta: 'ராசி' }, thDegree: { en: 'Degree', ta: 'பாகை' },
    thNak: { en: 'Nakshatra', ta: 'நட்சத்திரம்' }, thPada: { en: 'Pada', ta: 'பாதம்' }, thStarLord: { en: 'Star lord', ta: 'நட். அதிபதி' },
    thNav: { en: 'Navamsam', ta: 'நவாம்சம்' }, thHouse: { en: 'House', ta: 'வீடு' }, thDignity: { en: 'Dignity', ta: 'பலம்' },
    thNotes: { en: 'Notes', ta: 'குறிப்பு' },
    retro: { en: 'Retrograde', ta: 'வக்கிரம்' }, retroMark: { en: '(R)', ta: '(வ)' },
    combust: { en: 'Combust', ta: 'அஸ்தங்கம்' }, vargottama: { en: 'Vargottama', ta: 'வர்கோத்தமம்' },
    benefic: { en: 'Benefic', ta: 'சுபர்' }, malefic: { en: 'Malefic', ta: 'பாபர்' },

    panchangTitle: { en: 'Birth Panchangam', ta: 'ஜனன பஞ்சாங்கம்' },
    pTithi: { en: 'Tithi', ta: 'திதி' }, pVaara: { en: 'Day (Vaaram)', ta: 'கிழமை' }, pNak: { en: 'Nakshatra', ta: 'நட்சத்திரம்' },
    pYoga: { en: 'Yogam', ta: 'யோகம்' }, pKarana: { en: 'Karanam', ta: 'கரணம்' }, pTamilDate: { en: 'Tamil date', ta: 'தமிழ் தேதி' },
    pTamilYear: { en: 'Tamil year', ta: 'தமிழ் வருடம்' }, pSunrise: { en: 'Sunrise', ta: 'சூரிய உதயம்' }, pSunset: { en: 'Sunset', ta: 'சூரிய அஸ்தமனம்' },
    pNazhigai: { en: 'Udayadi nazhigai', ta: 'உதயாதி நாழிகை' }, pNazhigaiVal: { en: '{x} nazhigai {y} vinadi', ta: '{x} நாழிகை {y} விநாடி' },
    pAyanamsa: { en: 'Ayanamsa (Lahiri)', ta: 'அயனாம்சம் (லகிரி)' }, pUtc: { en: 'UTC offset used', ta: 'பயன்படுத்திய UTC வேறுபாடு' },
    pCoords: { en: 'Coordinates', ta: 'அட்ச/தீர்க்க ரேகை' }, pVedicDayNote: { en: 'before sunrise, so the Vedic day is the previous day', ta: 'சூரிய உதயத்திற்கு முன் — வேத முறைப்படி முந்தைய நாள்' },
    yearSuffix: { en: '{x} year', ta: '{x} வருடம்' },

    reportTitle: { en: 'Jathaga Palan', ta: 'ஜாதக பலன்' },
    reportSub: { en: 'Rule-based readings from classical Jathaga Sastra, generated from your chart.', ta: 'உங்கள் கட்டத்தில் இருந்து, பாரம்பரிய ஜாதக சாஸ்திர விதிகளின்படி உருவாக்கப்பட்ட பலன்கள்.' },
    tabStar: { en: 'Star & Rasi', ta: 'நட்சத்திரம் & ராசி' },
    tabLagna: { en: 'Lagna', ta: 'லக்னம்' },
    tabPillars: { en: 'Life pillars', ta: 'வாழ்க்கை அம்சங்கள்' },
    tabYoga: { en: 'Yogas & Doshas', ta: 'யோகங்கள் & தோஷங்கள்' },
    tabDasha: { en: 'Dasha-Bhukti Palan', ta: 'தசா புக்தி பலன்' },
    tabGraha: { en: 'Grahas in houses', ta: 'பாவங்களில் கிரகங்கள்' },
    disclaimer: { en: 'Jyotisha readings are traditional guidance for reflection, not certainties. They are not medical, legal or financial advice. For important decisions, consult a qualified astrologer and the right professional.', ta: 'ஜோதிட பலன்கள் சிந்தனைக்கான பாரம்பரிய வழிகாட்டல் மட்டுமே; உறுதியான முடிவுகள் அல்ல. இவை மருத்துவ, சட்ட அல்லது நிதி ஆலோசனை அல்ல. முக்கிய முடிவுகளுக்கு தகுதியான ஜோதிடரையும் உரிய நிபுணரையும் அணுகவும்.' },

    dashaTitle: { en: 'Vimshottari Dasha', ta: 'விம்சோத்தரி தசை' },
    dashaSub: { en: '120-year cycle from the Moon’s nakshatra at birth. Tap a Maha Dasha to see its Bhuktis.', ta: 'பிறப்பின் சந்திர நட்சத்திரத்தில் இருந்து 120 ஆண்டு சுழற்சி. புத்திகளைக் காண மகா தசையைத் தொடவும்.' },
    balance: { en: 'Dasha balance at birth', ta: 'ஜனன கால தசா இருப்பு' },
    balanceVal: { en: '{p} dasha: {y} years {m} months {d} days', ta: '{p} தசை இருப்பு: {y} ஆண்டு {m} மாதம் {d} நாள்' },
    mahaDasha: { en: 'Maha Dasha', ta: 'மகா தசை' }, bhukti: { en: 'Bhukti', ta: 'புத்தி' }, antaram: { en: 'Antaram', ta: 'அந்தரம்' },
    dashaOf: { en: '{p} Maha Dasha', ta: '{p} மகா தசை' }, bhuktiOf: { en: '{p} Bhukti', ta: '{p} புத்தி' },
    from: { en: 'From', ta: 'தொடக்கம்' }, to: { en: 'To', ta: 'முடிவு' }, age: { en: 'Age', ta: 'வயது' },
    ageRange: { en: 'age {x}–{y}', ta: '{x}–{y} வயது' },
    current: { en: 'Current', ta: 'நடப்பு' }, years: { en: '{x} yrs', ta: '{x} ஆண்டு' },
    nowLabel: { en: 'Now', ta: 'இன்று' },
    dashaPeriod: { en: '{p} Dasha · {q} Bhukti', ta: '{p} தசை · {q} புத்தி' },

    footerBuilt: { en: 'Thudinest Josiyam on thudinest.com · Planet positions: Astronomy Engine (MIT) · Places: GeoNames (CC BY 4.0) and © OpenStreetMap contributors', ta: 'துடிநெஸ்ட் ஜோசியம் · thudinest.com · கிரக நிலைகள்: Astronomy Engine (MIT) · ஊர்கள்: GeoNames (CC BY 4.0), © OpenStreetMap பங்களிப்பாளர்கள்' },
    backHome: { en: 'thudinest.com', ta: 'thudinest.com' },
    reduceMotion: { en: 'Reduce motion', ta: 'அசைவைக் குறை' },
    skip: { en: 'Skip to birth details', ta: 'பிறப்பு விவரங்களுக்குச் செல்' },
    dkKicker: { en: 'Dakshinai', ta: 'தட்சணை' },
    dkTitle: { en: 'Your Jathagam is complete', ta: 'உங்கள் ஜாதகம் நிறைவடைந்தது' },
    dkLead: { en: 'At the end of a reading, it is customary to offer the josiyar a small dakshinai. This one is free, ad free and private, and your offering keeps it that way.', ta: 'ஜாதகம் பார்த்து முடிந்ததும் ஜோசியருக்குச் சிறு தட்சணை வைப்பது நம் வழக்கம். இந்தச் சேவை இலவசம், விளம்பரமில்லாதது, தனிப்பட்டது. உங்கள் தட்சணை அதை அப்படியே தொடரச் செய்யும்.' },
    dkAmount: { en: 'Amount', ta: 'தொகை' },
    dkAny: { en: 'Any', ta: 'விருப்பம்' },
    dkScan: { en: 'Scan with GPay, PhonePe, Paytm or any UPI app', ta: 'GPay, PhonePe, Paytm அல்லது எந்த UPI செயலியிலும் ஸ்கேன் செய்யவும்' },
    dkQrAlt: { en: 'UPI QR code for Thudinest Josiyam', ta: 'துடிநெஸ்ட் ஜோசியம் UPI QR குறியீடு' },
    dkOpenApp: { en: 'Pay with a UPI app', ta: 'UPI செயலியில் செலுத்து' },
    dkSave: { en: 'Save QR to gallery', ta: 'QR-ஐ கேலரியில் சேமி' },
    dkUpi: { en: 'UPI ID', ta: 'UPI ஐடி' },
    dkCopy: { en: 'Copy', ta: 'நகலெடு' },
    dkCopied: { en: 'UPI ID copied', ta: 'UPI ஐடி நகலெடுக்கப்பட்டது' },
    dkDone: { en: 'I have offered 🙏', ta: 'தட்சணை வைத்துவிட்டேன் 🙏' },
    dkLater: { en: 'Maybe later', ta: 'பிறகு பார்க்கலாம்' },
    dkClose: { en: 'Close', ta: 'மூடு' },
    dkThanks: { en: 'Nandri! May the planets be kind to you 🙏', ta: 'நன்றி! கிரகங்கள் உங்களுக்கு நன்மை செய்யட்டும் 🙏' },
    dkStay: { en: 'Visiting Coimbatore? Stay with us at', ta: 'கோவைக்கு வருகிறீர்களா? தங்குவதற்கு' },
    dkFootLink: { en: 'Offer dakshinai', ta: 'தட்சணை வைக்க' },
    printedOn: { en: 'Generated on {x} at thudinest.com/josiyam', ta: '{x} அன்று thudinest.com/josiyam-இல் உருவாக்கப்பட்டது' }
  };

  /* ================================================================ NAKSHATRA PROFILES */
  K.nakProfile = [
    { deity: { en: 'Ashwini Kumaras, the divine physicians', ta: 'அசுவினி தேவர்கள் (தேவ மருத்துவர்கள்)' }, symbol: { en: 'Horse’s head', ta: 'குதிரைத் தலை' },
      en: 'Quick, bright and pioneering. You like to start things, move fast and help people recover from difficulty; healing, sport and travel come naturally. Honest and independent, you dislike delay, so patience and follow-through are the lessons.',
      ta: 'வேகமும் சுறுசுறுப்பும் புதுமை நாட்டமும் கொண்டவர். எதையும் முதலில் தொடங்குவதிலும், பிறரின் துன்பத்தைப் போக்குவதிலும் ஆர்வம்; மருத்துவம், விளையாட்டு, பயணம் இயல்பாக வரும். நேர்மையும் சுதந்திர மனமும் உண்டு; தாமதம் பிடிக்காது — பொறுமையும் தொடர்ச்சியும் வளர்க்க வேண்டியவை.' },
    { deity: { en: 'Yama, lord of dharma', ta: 'யமதர்மராஜன்' }, symbol: { en: 'Yoni (womb)', ta: 'யோனி' },
      en: 'Intense, determined and responsible. You carry burdens others avoid and stand firm on what you believe is right. Creative and sensual, with strong likes and dislikes; learning moderation and forgiveness brings out your best.',
      ta: 'உறுதியும் பொறுப்புணர்வும் மிக்கவர். பிறர் தவிர்க்கும் சுமைகளைத் தாங்குவீர்கள்; சரியென்று நம்புவதில் உறுதியாக நிற்பீர்கள். படைப்பாற்றலும் ரசனையும் உண்டு; விருப்பு வெறுப்புகள் வலுவாக இருக்கும் — அளவோடு இருப்பதும் மன்னிப்பதும் சிறப்பைத் தரும்.' },
    { deity: { en: 'Agni, the sacred fire', ta: 'அக்னி பகவான்' }, symbol: { en: 'Razor / flame', ta: 'கத்தி / தீச்சுடர்' },
      en: 'Sharp, principled and courageous. Like fire you purify: you cut through confusion, speak frankly and protect those in your care. Ambitious and proud, you do well in leadership and cooking, teaching or any work that needs a clear mind; soften criticism with warmth.',
      ta: 'கூர்மையான அறிவும் கொள்கைப் பிடிப்பும் தைரியமும் உடையவர். அக்னி போல் தூய்மைப்படுத்துபவர் — குழப்பத்தை அகற்றி, நேர்மையாகப் பேசி, சார்ந்தவர்களைக் காப்பீர்கள். தலைமை, கல்வி, சமையல் போன்ற துறைகளில் சிறப்பு; விமர்சனத்தை அன்போடு சொல்லப் பழகுங்கள்.' },
    { deity: { en: 'Brahma (Prajapati), the creator', ta: 'பிரம்மா (பிரஜாபதி)' }, symbol: { en: 'Chariot / ox-cart', ta: 'தேர் / வண்டி' },
      en: 'Charming, artistic and steady. Rohini is the Moon’s favourite star: you attract people, love beauty, nature, food and comfort, and build things that grow. Loyal and sensitive, with a good eye for value; guard against possessiveness and over-indulgence.',
      ta: 'வசீகரமும் கலையுணர்வும் நிதானமும் கொண்டவர். சந்திரனுக்கு மிகப் பிரியமான நட்சத்திரம்; மக்களை ஈர்ப்பீர்கள், அழகு, இயற்கை, உணவு, வசதிகளை விரும்புவீர்கள், வளர்ச்சி தரும் காரியங்களை உருவாக்குவீர்கள். விசுவாசமும் மென்மையும் உண்டு; அதிக பற்றும் அளவுக்கு மீறிய சுகமும் தவிர்க்கவும்.' },
    { deity: { en: 'Soma (the Moon)', ta: 'சோமன் (சந்திரன்)' }, symbol: { en: 'Deer’s head', ta: 'மான் தலை' },
      en: 'Curious, gentle and searching. Like the deer you are alert and always looking for the next idea, place or answer; research, writing, travel and trade suit you. Friendly and witty, though restless; a settled routine helps you finish what you begin.',
      ta: 'ஆர்வமும் மென்மையும் தேடலும் கொண்டவர். மான் போல் விழிப்புடன், புதிய எண்ணம், இடம், விடையைத் தேடிக்கொண்டே இருப்பீர்கள்; ஆராய்ச்சி, எழுத்து, பயணம், வணிகம் பொருந்தும். நட்பும் நகைச்சுவையும் உண்டு; அமைதியற்ற மனதுக்கு ஒழுங்கான வழக்கம் உதவும்.' },
    { deity: { en: 'Rudra, the storm form of Shiva', ta: 'ருத்திரன் (சிவபெருமான்)' }, symbol: { en: 'Teardrop', ta: 'கண்ணீர்த் துளி' },
      en: 'Intelligent, intense and transformative. Thiruvathirai, the star of Lord Nataraja, gives a sharp analytical mind and the ability to rebuild after storms. You question everything and do well in science, technology and research; emotional honesty and calm speech keep relationships strong.',
      ta: 'நுண்ணறிவும் தீவிரமும் மாற்றும் சக்தியும் கொண்டவர். நடராஜப் பெருமானின் திருவாதிரை நட்சத்திரம் கூர்மையான ஆய்வு மனத்தையும், புயலுக்குப் பின் மீண்டும் கட்டியெழுப்பும் ஆற்றலையும் தரும். அறிவியல், தொழில்நுட்பம், ஆராய்ச்சியில் சிறப்பு; அமைதியான பேச்சு உறவுகளை வலுப்படுத்தும்.' },
    { deity: { en: 'Aditi, mother of the gods', ta: 'அதிதி தேவி' }, symbol: { en: 'Bow and quiver', ta: 'வில்லும் அம்புறாத்தூணியும்' },
      en: 'Kind, hopeful and resilient. Punarvasu means “return of the light”: whatever you lose, you regain. You are generous, philosophical and content with simple things, a natural teacher and peace-maker; avoid giving too many second chances to the same mistake.',
      ta: 'கருணையும் நம்பிக்கையும் மீண்டு எழும் ஆற்றலும் கொண்டவர். புனர்பூசம் என்றால் “ஒளியின் மறுவருகை” — இழந்ததை மீண்டும் பெறுவீர்கள். தாராள மனமும் தத்துவ நோக்கும், எளிமையில் திருப்தியும் உண்டு; இயல்பான ஆசிரியர், சமாதானம் செய்பவர்.' },
    { deity: { en: 'Brihaspati, guru of the gods', ta: 'பிரகஸ்பதி (தேவ குரு)' }, symbol: { en: 'Cow’s udder / lotus', ta: 'பசுவின் மடி / தாமரை' },
      en: 'Nurturing, dutiful and dependable. Pusam is considered one of the most auspicious stars: you protect, feed and guide others, respect tradition and work steadily. Spiritual and disciplined, you earn trust easily; let others help you too.',
      ta: 'பேணிக் காக்கும் குணமும் கடமையுணர்வும் நம்பகத்தன்மையும் உடையவர். பூசம் மிகவும் சுபமான நட்சத்திரங்களில் ஒன்று; பிறரைக் காத்து, உணவளித்து, வழிநடத்துவீர்கள்; மரபை மதித்து நிதானமாக உழைப்பீர்கள். ஆன்மிகமும் ஒழுக்கமும் உண்டு; பிறர் உதவியையும் ஏற்றுக்கொள்ளுங்கள்.' },
    { deity: { en: 'The Nagas (serpent deities)', ta: 'நாக தேவதைகள்' }, symbol: { en: 'Coiled serpent', ta: 'சுருண்ட பாம்பு' },
      en: 'Perceptive, clever and deep. Ayilyam gives a penetrating mind, persuasive speech and a strong instinct for people’s motives; medicine, psychology, research and strategy suit you. Loyal to a few, guarded with many; use your influence kindly.',
      ta: 'உள்ளுணர்வும் சாதுர்யமும் ஆழ்ந்த சிந்தனையும் கொண்டவர். ஆயில்யம் ஊடுருவும் அறிவையும், வசப்படுத்தும் பேச்சையும், பிறர் எண்ணத்தை அறியும் திறனையும் தரும்; மருத்துவம், உளவியல், ஆராய்ச்சி, உத்தி வகுத்தல் பொருந்தும். உங்கள் செல்வாக்கை அன்புடன் பயன்படுத்துங்கள்.' },
    { deity: { en: 'The Pitrs (ancestors)', ta: 'பித்ருக்கள் (முன்னோர்)' }, symbol: { en: 'Royal throne', ta: 'அரியணை' },
      en: 'Dignified, generous and proud of your roots. Magam is the throne star: you have natural authority, respect for elders and ancestors, and a wish to be honoured for your work. Leadership, administration and heritage fields suit you; humility makes your authority last.',
      ta: 'கௌரவமும் தாராள குணமும், தம் வேர்களில் பெருமையும் கொண்டவர். “மகம் ஜகம் ஆளும்” — இயல்பான அதிகாரம், பெரியோர் மற்றும் முன்னோர் மீது மரியாதை, உழைப்புக்கான அங்கீகார விருப்பம் உண்டு. தலைமை, நிர்வாகப் பணிகள் பொருந்தும்; பணிவு உங்கள் அதிகாரத்தை நிலைக்கச் செய்யும்.' },
    { deity: { en: 'Bhaga, giver of delight and fortune', ta: 'பகன் (இன்பம், பாக்கியம் அருள்பவர்)' }, symbol: { en: 'Front legs of a bed / hammock', ta: 'கட்டிலின் முன்கால்கள்' },
      en: 'Warm, creative and pleasure-loving. Pooram brings charm, artistic talent and a gift for celebration and relationships; you make any space comfortable and friendly. Generous with friends and family; balance enjoyment with savings and steady effort.',
      ta: 'அன்பும் படைப்பாற்றலும் மகிழ்ச்சி நாட்டமும் கொண்டவர். பூரம் வசீகரத்தையும் கலைத் திறனையும், உறவுகளைப் பேணும் பண்பையும் தரும்; எந்த இடத்தையும் இனிமையாக்குவீர்கள். நண்பர், குடும்பத்தினரிடம் தாராளம்; மகிழ்ச்சியோடு சேமிப்பையும் உழைப்பையும் சமன் செய்யுங்கள்.' },
    { deity: { en: 'Aryaman, god of friendship and contracts', ta: 'அர்யமான் (நட்பு, ஒப்பந்த தேவதை)' }, symbol: { en: 'Back legs of a bed', ta: 'கட்டிலின் பின்கால்கள்' },
      en: 'Reliable, helpful and honourable. Uthiram makes you a loyal friend and a fair partner who keeps promises; you are good at organising people, public service and management. Others lean on you, so remember your own rest and needs.',
      ta: 'நம்பகத்தன்மையும் உதவும் மனமும் கௌரவமும் உடையவர். உத்திரம் வாக்குக் காக்கும் விசுவாசமான நண்பராகவும் நேர்மையான கூட்டாளியாகவும் ஆக்கும்; மக்களை ஒருங்கிணைத்தல், பொதுச் சேவை, நிர்வாகம் சிறப்பு. பிறர் உங்களைச் சார்ந்திருப்பார்கள் — உங்கள் ஓய்வையும் தேவைகளையும் மறக்காதீர்கள்.' },
    { deity: { en: 'Savitar, the Sun as giver of skill', ta: 'சவிதா (சூரியன்)' }, symbol: { en: 'Open hand', ta: 'கை' },
      en: 'Skilful, witty and resourceful. Hastam gives clever hands and a practical mind: crafts, healing, writing, trade and anything that needs dexterity. Cheerful and persuasive, you can turn little into much; avoid scattering energy across too many projects.',
      ta: 'கைத்திறனும் நகைச்சுவையும் சாமர்த்தியமும் உடையவர். அஸ்தம் திறமையான கைகளையும் நடைமுறை அறிவையும் தரும் — கைவினை, மருத்துவம், எழுத்து, வணிகம் சிறப்பு. மகிழ்ச்சியான பேச்சால் பிறரை ஈர்ப்பீர்கள்; சிறியதைப் பெரிதாக்குவீர்கள். ஒரே நேரத்தில் பல வேலைகளில் சக்தியைச் சிதறவிடாதீர்கள்.' },
    { deity: { en: 'Tvashtar (Vishwakarma), the divine architect', ta: 'துவஷ்டா (விஸ்வகர்மா)' }, symbol: { en: 'Bright jewel / pearl', ta: 'ஒளிரும் மணி / முத்து' },
      en: 'Stylish, talented and expressive. Chithirai gives an eye for design, structure and beauty — architecture, engineering, fashion, art and media suit you. Charismatic and energetic, you want your work to shine; patience in relationships matters as much as polish in work.',
      ta: 'அழகுணர்வும் திறமையும் வெளிப்பாட்டுத் திறனும் கொண்டவர். சித்திரை வடிவமைப்பு, கட்டமைப்பு, அழகில் கண்ணைத் தரும் — கட்டடக்கலை, பொறியியல், ஆடை வடிவமைப்பு, கலை, ஊடகம் பொருந்தும். உங்கள் படைப்பு ஒளிர வேண்டும் என்பது விருப்பம்; உறவுகளில் பொறுமையும் அவசியம்.' },
    { deity: { en: 'Vayu, the wind', ta: 'வாயு பகவான்' }, symbol: { en: 'Young sprout swaying in the wind', ta: 'காற்றில் அசையும் இளந்தளிர்' },
      en: 'Independent, flexible and diplomatic. Swathi gives a free spirit, good manners and business sense; you adapt well, travel easily and do well in trade, law and negotiation. You need space to grow; decisiveness and saving habits make your success steady.',
      ta: 'சுதந்திரமும் இணங்கும் தன்மையும் ராஜதந்திரமும் உடையவர். சுவாதி சுதந்திர மனத்தையும் நல்ல பண்பையும் வணிக அறிவையும் தரும்; வணிகம், சட்டம், பேச்சுவார்த்தையில் சிறப்பு. வளர இடம் தேவை; உறுதியான முடிவும் சேமிப்புப் பழக்கமும் வெற்றியை நிலைக்கச் செய்யும்.' },
    { deity: { en: 'Indra and Agni together', ta: 'இந்திரன் மற்றும் அக்னி' }, symbol: { en: 'Triumphal arch', ta: 'தோரண வாயில்' },
      en: 'Goal-driven, ambitious and focused. Visakam gives the patience to chase a target for years and reach it; you are persuasive, sociable and often successful in teaching, politics, research and enterprise. Keep your goals generous so that rivalry does not harden you.',
      ta: 'இலக்கை நோக்கிய உறுதியும் லட்சியமும் கவனமும் உடையவர். விசாகம் பல ஆண்டுகள் பொறுமையாக இலக்கைத் துரத்தி அடையும் ஆற்றலைத் தரும்; கல்வி, அரசியல், ஆராய்ச்சி, தொழில் முயற்சிகளில் வெற்றி. போட்டி மனப்பான்மை உங்களைக் கடினமாக்காமல் பார்த்துக்கொள்ளுங்கள்.' },
    { deity: { en: 'Mitra, god of friendship', ta: 'மித்திரன் (நட்பின் தேவதை)' }, symbol: { en: 'Lotus', ta: 'தாமரை' },
      en: 'Devoted, friendly and disciplined. Anusham builds lasting friendships and succeeds far from home; like the lotus you flourish in difficult waters. Organised and loyal, you do well in groups, institutions and spiritual practice; avoid holding on to hurt.',
      ta: 'பக்தியும் நட்பும் ஒழுக்கமும் கொண்டவர். அனுஷம் நீடித்த நட்புகளை உருவாக்கும்; பிறந்த ஊருக்கு வெளியிலும் வெற்றி தரும். தாமரை போல் கடினமான சூழலிலும் மலர்வீர்கள். குழுக்கள், நிறுவனங்கள், ஆன்மிகப் பயிற்சியில் சிறப்பு; மனக்காயங்களைப் பிடித்து வைத்துக்கொள்ள வேண்டாம்.' },
    { deity: { en: 'Indra, king of the gods', ta: 'இந்திரன் (தேவர்களின் அரசன்)' }, symbol: { en: 'Circular amulet / umbrella', ta: 'குண்டலம் / குடை' },
      en: 'Protective, capable and senior in spirit. Kettai gives courage, responsibility and the instinct to lead and defend the family; you handle crises well. Sensitive to respect and quick to react, you rise by combining authority with generosity.',
      ta: 'காக்கும் குணமும் திறமையும் மூத்தவர் மனப்பான்மையும் உடையவர். கேட்டை தைரியம், பொறுப்பு, குடும்பத்தை வழிநடத்திக் காக்கும் உள்ளுணர்வைத் தரும்; நெருக்கடிகளைச் சமாளிப்பீர்கள். மரியாதையை எதிர்பார்ப்பீர்கள்; அதிகாரத்தோடு தாராள மனம் சேர்ந்தால் உயர்வு.' },
    { deity: { en: 'Nirriti, goddess of dissolution', ta: 'நிருதி' }, symbol: { en: 'Bunch of roots', ta: 'வேர்க்கொத்து' },
      en: 'Philosophical, investigative and fearless. Moolam goes to the root of things: research, medicine, herbal knowledge, law and spirituality suit you. Life may bring sudden changes that clear the way for something better; steadiness in money and words protects you.',
      ta: 'தத்துவ நோக்கும் ஆராய்ச்சித் திறனும் அச்சமின்மையும் உடையவர். மூலம் எதன் வேரையும் தேடும் — ஆராய்ச்சி, மருத்துவம், மூலிகை அறிவு, சட்டம், ஆன்மிகம் பொருந்தும். திடீர் மாற்றங்கள் சிறந்த வழியைத் திறக்கும்; பணத்திலும் சொல்லிலும் நிதானம் காப்பு தரும்.' },
    { deity: { en: 'Apas, the waters', ta: 'அபஸ் (நீர் தேவதை)' }, symbol: { en: 'Winnowing fan', ta: 'முறம் / விசிறி' },
      en: 'Confident, persuasive and invigorating. Pooradam brings optimism and the power to win people over; you defend your views strongly and recover quickly. Good for teaching, law, media and travel; choose battles wisely and listen before you argue.',
      ta: 'தன்னம்பிக்கையும் வசீகரப் பேச்சும் உற்சாகமும் உடையவர். பூராடம் நம்பிக்கையையும் மக்களை வெல்லும் ஆற்றலையும் தரும்; உங்கள் கருத்தை உறுதியாகக் காப்பீர்கள். கல்வி, சட்டம், ஊடகம், பயணம் பொருந்தும்; வாதிடும் முன் கேளுங்கள்.' },
    { deity: { en: 'The Vishvedevas (universal gods)', ta: 'விஸ்வேதேவர்கள்' }, symbol: { en: 'Elephant’s tusk', ta: 'யானைத் தந்தம்' },
      en: 'Righteous, persistent and respected. Uthiradam gives a strong sense of ethics and the endurance to achieve lasting, “final” victories; you are trusted with responsibility and do well in government, management and service. Allow yourself flexibility and rest.',
      ta: 'நேர்மையும் விடாமுயற்சியும் மதிப்பும் உடையவர். உத்திராடம் உறுதியான நெறியையும் நிலையான வெற்றி பெறும் சகிப்புத்தன்மையையும் தரும்; பொறுப்புகள் நம்பி ஒப்படைக்கப்படும். அரசு, நிர்வாகம், சேவைப் பணிகளில் சிறப்பு; நெகிழ்வும் ஓய்வும் தேவை.' },
    { deity: { en: 'Lord Vishnu', ta: 'ஸ்ரீ விஷ்ணு (பெருமாள்)' }, symbol: { en: 'Ear / three footprints', ta: 'காது / மூன்று பாதச்சுவடுகள்' },
      en: 'A listener and learner. Thiruvonam, Lord Perumal’s star, gives wisdom gained by listening, a good memory and respect for tradition; teaching, counselling, media and travel suit you. Well-mannered and organised, you earn a good name; avoid worrying over others’ opinions.',
      ta: 'கேட்டுக் கற்பவர். பெருமாளின் திருவோண நட்சத்திரம் கேள்வி ஞானம், நல்ல நினைவாற்றல், மரபு மீது மரியாதை தரும்; கற்பித்தல், ஆலோசனை, ஊடகம், பயணம் பொருந்தும். நல்ல பண்பும் ஒழுங்கும் நற்பெயர் தரும்; பிறர் கருத்தைப் பற்றி அதிகம் கவலைப்பட வேண்டாம்.' },
    { deity: { en: 'The eight Vasus', ta: 'அஷ்ட வசுக்கள்' }, symbol: { en: 'Drum (mridangam)', ta: 'மிருதங்கம் / முரசு' },
      en: 'Rhythmic, generous and prosperous. Avittam gives musical and organisational talent, ambition and the ability to gather wealth and people; you thrive in teams, sport, music and property. Keep a balance between giving and saving, and between work and family.',
      ta: 'தாள உணர்வும் தாராளமும் செல்வ வளமும் உடையவர். அவிட்டம் இசைத் திறன், ஒருங்கிணைக்கும் ஆற்றல், செல்வத்தையும் மக்களையும் சேர்க்கும் திறனைத் தரும்; குழுப்பணி, விளையாட்டு, இசை, நிலம் சார்ந்த துறைகளில் சிறப்பு. கொடுப்பதற்கும் சேமிப்பதற்கும் சமநிலை வேண்டும்.' },
    { deity: { en: 'Varuna, lord of the cosmic waters', ta: 'வருண பகவான்' }, symbol: { en: 'Empty circle (100 stars)', ta: 'வெற்று வட்டம் (நூறு தாரகைகள்)' },
      en: 'Independent, scientific and healing. Sadhayam, the “hundred physicians”, gives a talent for medicine, research, technology and solving hidden problems; you think differently and value truth. You may like solitude — share your insights and keep trusted friends close.',
      ta: 'சுதந்திரமும் அறிவியல் நோக்கும் குணப்படுத்தும் ஆற்றலும் உடையவர். “நூறு மருத்துவர்கள்” என்ற சதயம் மருத்துவம், ஆராய்ச்சி, தொழில்நுட்பம், மறைந்த பிரச்சினைகளைத் தீர்ப்பதில் திறமை தரும்; வித்தியாசமாகச் சிந்திப்பீர்கள். தனிமையை விரும்பினாலும் நம்பிக்கையான நண்பர்களை அருகில் வைத்திருங்கள்.' },
    { deity: { en: 'Aja Ekapada, the one-footed form of Rudra', ta: 'அஜ ஏகபாதர்' }, symbol: { en: 'Swords / front of a funeral cot', ta: 'வாள் / கட்டிலின் முன்பகுதி' },
      en: 'Idealistic, intense and spiritual. Pooratathi gives strong convictions, eloquence and a reformer’s drive; you can be both worldly-wise and deeply devotional. Good for philosophy, finance, research and service; guard against extremes and anxiety.',
      ta: 'லட்சியமும் தீவிரமும் ஆன்மிகமும் கொண்டவர். பூரட்டாதி உறுதியான நம்பிக்கை, பேச்சுத் திறன், சீர்திருத்த ஆர்வம் தரும்; உலக அறிவும் ஆழ்ந்த பக்தியும் ஒருசேர இருக்கும். தத்துவம், நிதி, ஆராய்ச்சி, சேவை பொருந்தும்; தீவிர நிலைகளையும் பதற்றத்தையும் தவிர்க்கவும்.' },
    { deity: { en: 'Ahir Budhnya, serpent of the deep', ta: 'அஹிர்புத்னியர்' }, symbol: { en: 'Back of a funeral cot / twins', ta: 'கட்டிலின் பின்பகுதி / இரட்டையர்' },
      en: 'Wise, calm and self-controlled. Uthirattathi gives depth, patience and kindness; you think before you speak and keep your word. Counselling, teaching, research, charity and long-term planning suit you, and life usually becomes more prosperous with age.',
      ta: 'ஞானமும் அமைதியும் தன்னடக்கமும் கொண்டவர். உத்திரட்டாதி ஆழ்ந்த சிந்தனை, பொறுமை, கருணையைத் தரும்; யோசித்துப் பேசி வாக்குக் காப்பீர்கள். ஆலோசனை, கல்வி, ஆராய்ச்சி, அறப்பணி, நீண்டகாலத் திட்டமிடல் பொருந்தும்; வயது கூடக் கூட வளம் பெருகும்.' },
    { deity: { en: 'Pushan, the nourishing guide of travellers', ta: 'பூஷன் (பயணிகளின் காவலர்)' }, symbol: { en: 'Fish / drum', ta: 'மீன் / முரசு' },
      en: 'Gentle, compassionate and creative. Revathi, the last star, gives a protective, nurturing heart, artistic talent and a love of travel; you guide others safely to their goals. Trusting and generous, you do well in arts, care work and teaching; protect yourself from being taken for granted.',
      ta: 'மென்மையும் கருணையும் படைப்பாற்றலும் உடையவர். கடைசி நட்சத்திரமான ரேவதி காக்கும், பேணும் இதயத்தையும் கலைத் திறனையும் பயண ஆர்வத்தையும் தரும்; பிறரைப் பாதுகாப்பாக இலக்கு சேர்ப்பீர்கள். கலை, சேவை, கல்வியில் சிறப்பு; பிறர் உங்களை அலட்சியமாக எடுத்துக்கொள்ளாமல் பார்த்துக்கொள்ளுங்கள்.' }
  ];

  K.ganaText = {
    D: { en: 'Deva gana: gentle, generous, refined and drawn to dharma; you prefer harmony and are moved by kindness.', ta: 'தேவ கணம்: மென்மை, தாராளம், நல்லொழுக்கம், தர்ம நாட்டம்; இணக்கத்தை விரும்புவீர்கள், அன்புக்கு உருகுவீர்கள்.' },
    M: { en: 'Manushya gana: balanced and practical, ambitious for family and comfort, able to adapt between ideals and real life.', ta: 'மனுஷ கணம்: சமநிலையும் நடைமுறை அறிவும்; குடும்பம், வசதிக்காக முயல்பவர்; லட்சியத்தையும் வாழ்க்கை நடைமுறையையும் இணைப்பவர்.' },
    R: { en: 'Rakshasa gana: strong-willed, independent and protective, with sharp instincts and the courage to face hardship (this is about intensity, not about being bad).', ta: 'ராட்சச கணம்: மன உறுதி, சுதந்திரம், காக்கும் குணம், கூர்மையான உள்ளுணர்வு, கடினங்களை எதிர்கொள்ளும் தைரியம் (இது தீவிரத்தைக் குறிக்கும்; தீய குணத்தை அல்ல).' }
  };
  K.nadiText = {
    en: 'Nadi and Yoni are used in marriage matching (Nadi and Yoni porutham); the same nadi in both partners is traditionally avoided.',
    ta: 'திருமணப் பொருத்தத்தில் நாடி, யோனி பொருத்தங்கள் பார்க்கப்படுகின்றன; இருவருக்கும் ஒரே நாடி இருப்பதைப் பாரம்பரியமாகத் தவிர்ப்பர்.'
  };
  K.padaText = {
    en: 'Pada {x} places your Moon in {s} navamsam, which colours this star with {y} qualities.',
    ta: '{x}-ஆம் பாதம் உங்கள் சந்திரனை {sa} நவாம்சத்தில் வைக்கிறது; இது இந்த நட்சத்திரத்திற்கு {y} தன்மையைச் சேர்க்கிறது.'
  };

  /* ================================================================ RASI PALAN (MOON SIGN) */
  K.rasiPalan = [
    { en: 'Mesha Rasi: an energetic, courageous mind that needs action and challenge. You react quickly, recover quickly and dislike being controlled. Channel the fire into sport or a cause; count to ten before replying in anger.',
      ta: 'மேஷ ராசி: செயல்பாட்டையும் சவால்களையும் விரும்பும் உற்சாகமான, தைரியமான மனம். விரைவாக எதிர்வினை செய்து விரைவாக மீள்வீர்கள்; கட்டுப்பாடு பிடிக்காது. கோபத்தில் பதில் சொல்லும் முன் சற்று நிதானியுங்கள்.' },
    { en: 'Rishaba Rasi: the Moon is exalted here, giving a calm, contented and loyal mind. You love comfort, music, good food and beautiful things, and you build security slowly and surely. Stay open to change; stubbornness is the only shadow.',
      ta: 'ரிஷப ராசி: சந்திரன் உச்சம் பெறும் ராசி; அமைதியான, திருப்தியான, விசுவாசமான மனம். வசதி, இசை, நல்ல உணவு, அழகான பொருட்களை விரும்புவீர்கள்; பாதுகாப்பை மெதுவாக உறுதியாகக் கட்டுவீர்கள். பிடிவாதம் மட்டும் தவிர்க்கவும்.' },
    { en: 'Mithuna Rasi: a quick, curious and talkative mind that loves learning, news and variety. Friendly and witty, you can see two sides of everything; a calm routine and fewer parallel tasks help you finish what you begin.',
      ta: 'மிதுன ராசி: கற்றல், செய்திகள், பல்வகைமையை விரும்பும் வேகமான, ஆர்வமான, பேச்சுத்திறன் மிக்க மனம். நட்பும் நகைச்சுவையும் உண்டு; எதிலும் இரு பக்கங்களையும் பார்ப்பீர்கள். ஒழுங்கான வழக்கம் தொடங்கியதை முடிக்க உதவும்.' },
    { en: 'Kataka Rasi: the Moon’s own sign — a sensitive, caring and imaginative mind, deeply attached to home, mother and family. Your memory and intuition are strong and your moods follow the tides; a safe home base keeps you steady.',
      ta: 'கடக ராசி: சந்திரனின் சொந்த வீடு — மென்மையான, அக்கறையான, கற்பனை வளமிக்க மனம்; வீடு, தாய், குடும்பத்தின் மீது ஆழ்ந்த பற்று. நினைவாற்றலும் உள்ளுணர்வும் வலுவானவை; மனநிலை அலைபோல் மாறும் — அமைதியான இல்லம் உங்களை நிலைப்படுத்தும்.' },
    { en: 'Simha Rasi: a proud, warm-hearted and generous mind that wants to lead and be respected. You are loyal to those you love and dislike pettiness; recognition motivates you, and humility makes your leadership shine.',
      ta: 'சிம்ம ராசி: தலைமை தாங்கவும் மதிக்கப்படவும் விரும்பும் பெருமிதமான, அன்பான, தாராள மனம். அன்புக்குரியவர்களிடம் விசுவாசம்; அற்பத்தனம் பிடிக்காது. அங்கீகாரம் ஊக்கம் தரும்; பணிவு உங்கள் தலைமையை ஒளிரச் செய்யும்.' },
    { en: 'Kanni Rasi: an analytical, modest and practical mind that notices details and wants to be useful. Health-conscious and orderly, you are a good adviser; avoid over-worrying and judge yourself as kindly as you judge others.',
      ta: 'கன்னி ராசி: நுணுக்கங்களைக் கவனிக்கும், பயனுள்ளவராக இருக்க விரும்பும் ஆய்வுத் திறன் மிக்க, அடக்கமான, நடைமுறை மனம். உடல்நல அக்கறையும் ஒழுங்கும் உண்டு; நல்ல ஆலோசகர். அதிகக் கவலையைத் தவிர்க்கவும்.' },
    { en: 'Thula Rasi: a balanced, social and artistic mind that seeks fairness and harmony. You are diplomatic and charming and feel best in partnership; practise saying a clear “no” so that you do not carry others’ decisions.',
      ta: 'துலா ராசி: நீதியையும் இணக்கத்தையும் நாடும் சமநிலையான, சமூகப் பண்புள்ள, கலையுணர்வு கொண்ட மனம். ராஜதந்திரமும் வசீகரமும் உண்டு; கூட்டாக இருக்கும்போது சிறப்பாக உணர்வீர்கள். தேவையான இடத்தில் தெளிவாக “இல்லை” சொல்லப் பழகுங்கள்.' },
    { en: 'Viruchiga Rasi: the Moon is debilitated here, so emotions run deep and intense. You are loyal, determined and perceptive, and you rarely forget either kindness or hurt. Meditation, honest conversation and letting go turn this intensity into great inner strength.',
      ta: 'விருச்சிக ராசி: சந்திரன் நீசம் பெறும் ராசி; உணர்ச்சிகள் ஆழமாகவும் தீவிரமாகவும் இருக்கும். விசுவாசம், உறுதி, ஊடுருவும் பார்வை உண்டு; நன்மையையும் காயத்தையும் எளிதில் மறக்க மாட்டீர்கள். தியானம், மனம் திறந்த பேச்சு, மன்னிப்பு — இவை இத்தீவிரத்தை உள்வலிமையாக மாற்றும்.' },
    { en: 'Dhanusu Rasi: an optimistic, principled and freedom-loving mind. You are frank, generous and drawn to philosophy, religion, travel and higher learning; keep promises realistic and temper bluntness with tact.',
      ta: 'தனுசு ராசி: நம்பிக்கையும் கொள்கைப் பிடிப்பும் சுதந்திர நாட்டமும் கொண்ட மனம். வெளிப்படையும் தாராளமும் உண்டு; தத்துவம், சமயம், பயணம், உயர்கல்வியில் ஆர்வம். நடைமுறைக்கு ஏற்ற வாக்குறுதிகள் கொடுங்கள்; வெளிப்படைப் பேச்சில் மென்மை சேர்க்கவும்.' },
    { en: 'Makara Rasi: a practical, disciplined and responsible mind that keeps feelings private. You work hard, plan ahead and grow more successful with age; allow yourself joy and rest, not only duty.',
      ta: 'மகர ராசி: உணர்வுகளை வெளிக்காட்டாத நடைமுறை, ஒழுக்கம், பொறுப்புணர்வு மிக்க மனம். கடின உழைப்பும் முன்திட்டமிடலும் உண்டு; வயது கூடக் கூட வெற்றி பெருகும். கடமை மட்டுமல்ல, மகிழ்ச்சியும் ஓய்வும் உங்களுக்குத் தேவை.' },
    { en: 'Kumbha Rasi: a thoughtful, humanitarian and original mind. You value fairness, friendship and new ideas, and you can stay calm when others panic; stay connected to your own feelings and to the people closest to you.',
      ta: 'கும்ப ராசி: சிந்தனை, மனிதநேயம், புதுமை கொண்ட மனம். நியாயம், நட்பு, புதிய எண்ணங்களை மதிப்பீர்கள்; பிறர் பதறும்போது அமைதியாக இருப்பீர்கள். உங்கள் உணர்வுகளோடும் நெருங்கியவர்களோடும் தொடர்பில் இருங்கள்.' },
    { en: 'Meena Rasi: a compassionate, imaginative and spiritual mind, sensitive to others’ moods. You are generous, artistic and intuitive; firm boundaries and a regular routine protect your energy and help dreams become real.',
      ta: 'மீன ராசி: கருணையும் கற்பனையும் ஆன்மிகமும் கொண்ட, பிறர் மனநிலையை உணரும் மனம். தாராளம், கலைத்திறன், உள்ளுணர்வு உண்டு; தெளிவான எல்லைகளும் ஒழுங்கான வழக்கமும் உங்கள் சக்தியைக் காத்து கனவுகளை நனவாக்கும்.' }
  ];

  /* ================================================================ LAGNA READINGS */
  K.lagnaReading = [
    { en: 'Mesha Lagna, ruled by Mars: an active, bold and enterprising constitution. Often a lean, athletic build with sharp features and a quick walk. You think fast, decide fast and like to lead; competitive and honest, you can be impatient and hot-headed. Head, fevers and injuries from haste need care.',
      ta: 'மேஷ லக்னம், அதிபதி செவ்வாய்: சுறுசுறுப்பு, தைரியம், முன்முயற்சி மிக்க அமைப்பு. பெரும்பாலும் ஒல்லியான, விளையாட்டு வீரர் போன்ற உடல், கூர்மையான முக அமைப்பு. வேகமாகச் சிந்தித்து வேகமாக முடிவெடுப்பீர்கள்; தலைமை விருப்பம், நேர்மை உண்டு; பொறுமையின்மையும் முன்கோபமும் கவனிக்கவும். தலை, காய்ச்சல், அவசரத்தால் காயம் — கவனம் தேவை.' },
    { en: 'Rishaba Lagna, ruled by Venus: a steady, patient and pleasant constitution. Often a sturdy frame, strong neck and attractive eyes or voice. You value security, beauty, family and good food, work steadily and are loyal; stubbornness and comfort-seeking are the weak points. Throat, thyroid and weight need attention.',
      ta: 'ரிஷப லக்னம், அதிபதி சுக்கிரன்: நிதானம், பொறுமை, இனிமை கொண்ட அமைப்பு. பெரும்பாலும் உறுதியான உடல், வலுவான கழுத்து, கவர்ச்சியான கண்கள் அல்லது குரல். பாதுகாப்பு, அழகு, குடும்பம், நல்ல உணவை மதிப்பீர்கள்; நிலையான உழைப்பும் விசுவாசமும் உண்டு; பிடிவாதமும் சுக நாட்டமும் குறைகள். தொண்டை, தைராய்டு, எடை கவனிக்கவும்.' },
    { en: 'Mithuna Lagna, ruled by Mercury: a lively, youthful and communicative constitution. Often tall or slim with expressive hands and a quick smile. You are curious, witty and versatile, learn fast and enjoy people and ideas; a restless mind and nervous energy need rest and routine. Lungs, shoulders and nerves are sensitive areas.',
      ta: 'மிதுன லக்னம், அதிபதி புதன்: உற்சாகம், இளமை, பேச்சுத்திறன் மிக்க அமைப்பு. பெரும்பாலும் உயரமான அல்லது ஒல்லியான உடல், பேசும் கைகள், விரைவான புன்னகை. ஆர்வம், நகைச்சுவை, பல்திறமை உண்டு; விரைவாகக் கற்பீர்கள். அமைதியற்ற மனதுக்கு ஓய்வும் ஒழுங்கும் தேவை. நுரையீரல், தோள், நரம்புகள் கவனிக்கவும்.' },
    { en: 'Kataka Lagna, ruled by the Moon: a caring, sensitive and imaginative constitution. Often a round or soft face and a gentle manner that changes with mood. Home, mother and family are central; you are protective, intuitive and have a long memory. Digestion, chest and water balance follow your emotional state.',
      ta: 'கடக லக்னம், அதிபதி சந்திரன்: அக்கறை, மென்மை, கற்பனை கொண்ட அமைப்பு. பெரும்பாலும் வட்டமான முகம், மனநிலைக்கு ஏற்ப மாறும் மென்மையான நடத்தை. வீடு, தாய், குடும்பம் மையம்; காக்கும் குணம், உள்ளுணர்வு, நீண்ட நினைவாற்றல் உண்டு. செரிமானம், மார்பு, நீர்ச் சமநிலை மனநிலையைப் பொறுத்து மாறும்.' },
    { en: 'Simha Lagna, ruled by the Sun: a dignified, confident and generous constitution. Often broad shoulders, a commanding presence and a strong voice. You are principled, warm and natural in leadership, and you like your work to be recognised; pride and ego clashes need watching. Heart, spine and eyes deserve care.',
      ta: 'சிம்ம லக்னம், அதிபதி சூரியன்: கௌரவம், தன்னம்பிக்கை, தாராளம் கொண்ட அமைப்பு. பெரும்பாலும் அகன்ற தோள், கம்பீரமான தோற்றம், வலுவான குரல். கொள்கைப் பிடிப்பும் அன்பும் இயல்பான தலைமையும் உண்டு; உழைப்புக்கு அங்கீகாரம் விரும்புவீர்கள்; கர்வமும் அகந்தை மோதல்களும் தவிர்க்கவும். இதயம், முதுகுத்தண்டு, கண்கள் கவனிக்கவும்.' },
    { en: 'Kanni Lagna, ruled by Mercury: a neat, practical and analytical constitution. Often a youthful appearance that lasts, and a careful, modest manner. You notice details, love order and like to serve and improve things; perfectionism and worry can drain you. Digestion and the intestines are sensitive — regular, simple meals help.',
      ta: 'கன்னி லக்னம், அதிபதி புதன்: நேர்த்தி, நடைமுறை அறிவு, ஆய்வுத்திறன் கொண்ட அமைப்பு. பெரும்பாலும் நீடிக்கும் இளமைத் தோற்றம், கவனமான அடக்கமான நடத்தை. நுணுக்கம், ஒழுங்கு, சேவை, மேம்படுத்தும் ஆர்வம் உண்டு; அதிகப் பூரணத்துவ நாட்டமும் கவலையும் சோர்வு தரும். செரிமானம், குடல் கவனிக்கவும் — நேரத்திற்கு எளிய உணவு உதவும்.' },
    { en: 'Thula Lagna, ruled by Venus: a balanced, graceful and sociable constitution. Often a well-proportioned body, pleasant face and good dress sense. You seek fairness, beauty and partnership, are diplomatic and artistic, and dislike conflict; indecision is the main challenge. Kidneys, lower back and skin need care.',
      ta: 'துலா லக்னம், அதிபதி சுக்கிரன்: சமநிலை, நளினம், சமூகப் பண்பு கொண்ட அமைப்பு. பெரும்பாலும் சீரான உடலமைப்பு, இனிய முகம், நல்ல உடை ரசனை. நீதி, அழகு, கூட்டுறவை நாடுவீர்கள்; ராஜதந்திரமும் கலையுணர்வும் உண்டு; முடிவெடுக்கத் தயக்கமே முக்கிய சவால். சிறுநீரகம், கீழ் முதுகு, சருமம் கவனிக்கவும்.' },
    { en: 'Viruchiga Lagna, ruled by Mars: an intense, determined and perceptive constitution. Often a strong build and magnetic, penetrating eyes. You are loyal, private and resilient, and you excel at research and crisis management; suspicion and holding grudges are the shadows. Reproductive and excretory health need regular care.',
      ta: 'விருச்சிக லக்னம், அதிபதி செவ்வாய்: தீவிரம், உறுதி, ஊடுருவும் பார்வை கொண்ட அமைப்பு. பெரும்பாலும் வலுவான உடல், காந்தக் கண்கள். விசுவாசம், ரகசியம் காக்கும் தன்மை, மீண்டு எழும் ஆற்றல் உண்டு; ஆராய்ச்சியிலும் நெருக்கடி மேலாண்மையிலும் சிறப்பு; சந்தேகமும் பழிவாங்கும் எண்ணமும் தவிர்க்கவும். இனப்பெருக்க, கழிவு உறுப்புகளின் நலம் கவனிக்கவும்.' },
    { en: 'Dhanusu Lagna, ruled by Jupiter: an optimistic, upright and generous constitution. Often tall with an open, friendly face. You love freedom, truth, travel and learning, and you often become a guide or teacher to others; bluntness and over-promising are the pitfalls. Liver, hips and thighs need attention.',
      ta: 'தனுசு லக்னம், அதிபதி குரு: நம்பிக்கை, நேர்மை, தாராளம் கொண்ட அமைப்பு. பெரும்பாலும் உயரமான உடல், திறந்த நட்பான முகம். சுதந்திரம், உண்மை, பயணம், கல்வியை விரும்புவீர்கள்; பிறருக்கு வழிகாட்டியாக ஆவீர்கள்; வெளிப்படையான கடும் பேச்சும் அதிக வாக்குறுதியும் தவிர்க்கவும். கல்லீரல், இடுப்பு, தொடைகள் கவனிக்கவும்.' },
    { en: 'Makara Lagna, ruled by Saturn: a disciplined, practical and patient constitution. Often a lean, wiry frame that grows stronger with age. You are ambitious, responsible and reserved, and you climb steadily rather than quickly; pessimism and overwork need balancing. Knees, joints, bones and teeth need care.',
      ta: 'மகர லக்னம், அதிபதி சனி: ஒழுக்கம், நடைமுறை அறிவு, பொறுமை கொண்ட அமைப்பு. பெரும்பாலும் ஒல்லியான, உறுதியான உடல்; வயது கூடக் கூட வலிமை கூடும். லட்சியம், பொறுப்பு, அடக்கம் உண்டு; வேகமாக அல்ல, நிலையாக உயர்வீர்கள்; அவநம்பிக்கையும் அதிக உழைப்பும் சமன் செய்ய வேண்டும். முழங்கால், மூட்டுகள், எலும்பு, பற்கள் கவனிக்கவும்.' },
    { en: 'Kumbha Lagna, ruled by Saturn: a thoughtful, independent and humanitarian constitution. Often tall with a distinctive, friendly face. You think in systems and ideas, value fairness and friendship, and are drawn to science and service; detachment and stubborn opinions are the pitfalls. Circulation, calves and ankles need attention.',
      ta: 'கும்ப லக்னம், அதிபதி சனி: சிந்தனை, சுதந்திரம், மனிதநேயம் கொண்ட அமைப்பு. பெரும்பாலும் உயரமான உடல், தனித்துவமான நட்பான முகம். அமைப்புகளாகவும் கருத்துகளாகவும் சிந்திப்பீர்கள்; நியாயம், நட்பு, அறிவியல், சேவையில் ஆர்வம்; பற்றின்மையும் பிடிவாதக் கருத்துகளும் தவிர்க்கவும். ரத்த ஓட்டம், கால் சதை, கணுக்கால் கவனிக்கவும்.' },
    { en: 'Meena Lagna, ruled by Jupiter: a gentle, compassionate and imaginative constitution. Often soft, expressive eyes and a kind manner. You are intuitive, artistic and spiritual, and help others quietly; indecision and escaping into dreams are the challenges. Feet, sleep and the lymphatic system need care.',
      ta: 'மீன லக்னம், அதிபதி குரு: மென்மை, கருணை, கற்பனை கொண்ட அமைப்பு. பெரும்பாலும் பேசும் மென்மையான கண்கள், அன்பான நடத்தை. உள்ளுணர்வு, கலைத்திறன், ஆன்மிகம் உண்டு; பிறருக்கு அமைதியாக உதவுவீர்கள்; முடிவெடுக்கத் தயக்கமும் கனவுலகில் ஒதுங்குவதும் சவால்கள். பாதங்கள், உறக்கம், நிணநீர் மண்டலம் கவனிக்கவும்.' }
  ];

  K.lagnaLordInHouse = [
    { en: 'The Lagna lord in the Lagna itself makes you self-made, healthy and confident: your personality is your biggest asset and life improves through your own effort.',
      ta: 'லக்னாதிபதி லக்னத்திலேயே இருப்பதால் சுயமுயற்சியால் உயர்பவர், நல்ல உடல்நலம், தன்னம்பிக்கை உண்டு; உங்கள் ஆளுமையே பெரிய சொத்து.' },
    { en: 'The Lagna lord in the 2nd links your life with family, savings and speech: you work for financial security, value tradition and can earn through your own name and words.',
      ta: 'லக்னாதிபதி 2-ஆம் வீட்டில் — குடும்பம், சேமிப்பு, வாக்கு சார்ந்த வாழ்க்கை; பொருளாதாரப் பாதுகாப்புக்காக உழைப்பீர்கள்; உங்கள் பெயராலும் சொல்லாலும் சம்பாதிப்பீர்கள்.' },
    { en: 'The Lagna lord in the 3rd gives courage, initiative and communication skills: success comes through your own effort, short travels, writing, media or siblings’ support.',
      ta: 'லக்னாதிபதி 3-ஆம் வீட்டில் — தைரியம், முன்முயற்சி, தொடர்புத் திறன்; சுயமுயற்சி, குறுகிய பயணம், எழுத்து, ஊடகம், சகோதரர் ஆதரவால் வெற்றி.' },
    { en: 'The Lagna lord in the 4th gives a comfortable life with home, vehicles and property; you are attached to your mother and native place, and education brings happiness.',
      ta: 'லக்னாதிபதி 4-ஆம் வீட்டில் — வீடு, வாகனம், சொத்து கொண்ட சுகமான வாழ்க்கை; தாய் மற்றும் சொந்த ஊர் மீது பற்று; கல்வி மகிழ்ச்சி தரும்.' },
    { en: 'The Lagna lord in the 5th is fortunate: intelligence, creativity, devotion and the blessing of good children; past merit (poorva punya) supports you and advisory roles suit you.',
      ta: 'லக்னாதிபதி 5-ஆம் வீட்டில் — சுபமான அமைப்பு: அறிவு, படைப்பாற்றல், பக்தி, நல்ல குழந்தைகள்; பூர்வ புண்ணியம் துணை நிற்கும்; ஆலோசனைப் பணிகள் பொருந்தும்.' },
    { en: 'The Lagna lord in the 6th makes you a fighter: you overcome competition and obstacles through hard work and service, but health routines and debts need regular attention.',
      ta: 'லக்னாதிபதி 6-ஆம் வீட்டில் — போராடி வெல்பவர்; கடின உழைப்பாலும் சேவையாலும் போட்டி, தடைகளை வெல்வீர்கள்; ஆனால் உடல்நலப் பழக்கங்களும் கடன்களும் கவனம் தேவை.' },
    { en: 'The Lagna lord in the 7th centres life on partnership: marriage, business and public dealings shape your destiny, and travel or living away from home is likely.',
      ta: 'லக்னாதிபதி 7-ஆம் வீட்டில் — வாழ்க்கை கூட்டுறவை மையமாகக் கொண்டது; திருமணம், வணிகம், பொது உறவுகள் உங்கள் விதியை வடிவமைக்கும்; பயணம் அல்லது வெளியூர் வாழ்க்கை வாய்ப்பு.' },
    { en: 'The Lagna lord in the 8th brings depth and resilience along with ups and downs: research, hidden knowledge and other people’s resources feature; look after health with regular check-ups.',
      ta: 'லக்னாதிபதி 8-ஆம் வீட்டில் — ஏற்றத் தாழ்வுகளோடு ஆழமும் மீண்டு எழும் ஆற்றலும்; ஆராய்ச்சி, மறைபொருள் அறிவு, பிறர் சொத்து சார்ந்த விஷயங்கள்; முறையான உடல் பரிசோதனைகள் நல்லது.' },
    { en: 'The Lagna lord in the 9th is very fortunate: righteous, respected and blessed by father, teachers and dharma; luck arrives at the right moments and long journeys help.',
      ta: 'லக்னாதிபதி 9-ஆம் வீட்டில் — மிகுந்த பாக்கியம்: நேர்மை, மதிப்பு, தந்தை, குரு, தர்மத்தின் அருள்; சரியான நேரத்தில் அதிர்ஷ்டம் வரும்; தூரப் பயணங்கள் நன்மை தரும்.' },
    { en: 'The Lagna lord in the 10th makes you career-focused and ambitious: your status is self-made and you are recognised for your work and conduct.',
      ta: 'லக்னாதிபதி 10-ஆம் வீட்டில் — தொழில் கவனமும் லட்சியமும்; சுயமாக உருவாக்கிய அந்தஸ்து; உங்கள் உழைப்புக்கும் நடத்தைக்கும் அங்கீகாரம்.' },
    { en: 'The Lagna lord in the 11th brings gains, influential friends and fulfilment of ambitions; income grows through networks, elder siblings and steady goals.',
      ta: 'லக்னாதிபதி 11-ஆம் வீட்டில் — லாபம், செல்வாக்குள்ள நண்பர்கள், ஆசைகள் நிறைவேறுதல்; வட்டாரத் தொடர்புகள், மூத்த சகோதரர், நிலையான இலக்குகள் மூலம் வருமானம் பெருகும்.' },
    { en: 'The Lagna lord in the 12th draws you towards foreign lands, spirituality and service; expenses need planning, and you may settle away from your birthplace.',
      ta: 'லக்னாதிபதி 12-ஆம் வீட்டில் — வெளிநாடு, ஆன்மிகம், சேவை நோக்கி ஈர்ப்பு; செலவுகளுக்குத் திட்டமிடல் தேவை; பிறந்த ஊருக்கு வெளியே குடியேறும் வாய்ப்பு.' }
  ];

  /* ================================================================ GRAHAS IN HOUSES (from Lagna) */
  const gb = (rows) => rows.map(([en, ta]) => ({ en, ta }));
  K.grahaBhava = {
    Sun: gb([
      ['Sun in the Lagna gives confidence, dignity and natural leadership with good vitality. Pride and a short temper need watching; independence comes early.',
        'லக்னத்தில் சூரியன்: தன்னம்பிக்கை, கௌரவம், இயல்பான தலைமைப் பண்பு, நல்ல உடல் வலிமை. கர்வமும் முன்கோபமும் தவிர்க்கவும்; இளமையிலேயே சுயசார்பு.'],
      ['Sun in the 2nd: earnings through authority, government or the family enterprise, and weighty speech. Avoid harsh words; look after the eyes and teeth.',
        '2-இல் சூரியன்: அதிகாரம், அரசு அல்லது குடும்பத் தொழில் மூலம் வருமானம்; மதிப்புள்ள பேச்சு. கடுஞ்சொல் தவிர்க்கவும்; கண், பற்கள் கவனிக்கவும்.'],
      ['Sun in the 3rd: courageous and enterprising, good relations with people in power and success in communication, short travel and new initiatives.',
        '3-இல் சூரியன்: தைரியமும் முயற்சியும்; அதிகாரத்தில் உள்ளவர்களுடன் நல்லுறவு; தொடர்பு, குறுகிய பயணம், புதிய முயற்சிகளில் வெற்றி.'],
      ['Sun in the 4th: a wish for a dignified home and status; property comes through effort. Some restlessness at home, and the bond with mother needs care.',
        '4-இல் சூரியன்: கௌரவமான வீடு, அந்தஸ்து விருப்பம்; முயற்சியால் சொத்து. வீட்டில் சிறு அமைதியின்மை; தாயுடனான உறவில் கவனம் தேவை.'],
      ['Sun in the 5th: intelligent and principled, interested in politics, mantra and leadership. Children may be few but capable; avoid speculative risks driven by pride.',
        '5-இல் சூரியன்: அறிவும் கொள்கைப் பிடிப்பும்; அரசியல், மந்திரம், தலைமையில் ஆர்வம். குழந்தைகள் குறைவாக இருந்தாலும் திறமைசாலிகள்; பெருமைக்காக ஊக வணிகம் வேண்டாம்.'],
      ['Sun in the 6th: you defeat rivals and recover well from illness. Excellent for administration, medicine, law and service; enemies do not last long.',
        '6-இல் சூரியன்: எதிரிகளை வெல்வீர்கள்; நோயிலிருந்து நன்கு மீள்வீர்கள். நிர்வாகம், மருத்துவம், சட்டம், சேவைப் பணிகளுக்கு மிகச் சிறப்பு.'],
      ['Sun in the 7th: a proud, strong-willed partner; ego clashes in marriage need patience. Partnerships with influential people or government are possible.',
        '7-இல் சூரியன்: பெருமிதமும் மன உறுதியும் கொண்ட வாழ்க்கைத் துணை; திருமணத்தில் அகந்தை மோதல்களுக்குப் பொறுமை தேவை. செல்வாக்குள்ளவர்களுடன் கூட்டு வாய்ப்பு.'],
      ['Sun in the 8th: interest in research and hidden matters, possible inheritance and sudden changes of status. Care for the eyes, heart and vitality.',
        '8-இல் சூரியன்: ஆராய்ச்சி, மறைபொருள் விஷயங்களில் ஆர்வம்; பரம்பரைச் சொத்து வாய்ப்பு; அந்தஸ்தில் திடீர் மாற்றங்கள். கண், இதயம், உடல் வலிமை கவனிக்கவும்.'],
      ['Sun in the 9th: righteous and respectful of tradition, with a prominent father and fortune through authority; differences of opinion with father are possible.',
        '9-இல் சூரியன்: தர்மநெறியும் மரபு மீது மரியாதையும்; தந்தை புகழ்பெற்றவர்; அதிகாரத்தால் பாக்கியம். தந்தையுடன் கருத்து வேறுபாடு வரலாம்.'],
      ['Sun in the 10th is one of its best placements (dig bala): authority, government favour, leadership and fame through your work.',
        '10-இல் சூரியன் மிகச் சிறந்த நிலை (திக் பலம்): அதிகாரம், அரசு ஆதரவு, தலைமை, தொழில் மூலம் புகழ்.'],
      ['Sun in the 11th: gains through influential people, government and elder siblings; ambitions are fulfilled and friends are of high standing.',
        '11-இல் சூரியன்: செல்வாக்குள்ளவர்கள், அரசு, மூத்த சகோதரர் மூலம் லாபம்; லட்சியங்கள் நிறைவேறும்; உயர்நிலை நண்பர்கள்.'],
      ['Sun in the 12th: expenses on travel and dignity, connections abroad and a spiritual bent; work in institutions or behind the scenes suits you. Protect eyesight and sleep.',
        '12-இல் சூரியன்: பயணம், கௌரவத்திற்கான செலவு; வெளிநாட்டுத் தொடர்பு, ஆன்மிக நாட்டம்; நிறுவனங்கள் அல்லது திரைமறைவுப் பணி பொருந்தும். கண்பார்வை, உறக்கம் கவனிக்கவும்.']
    ]),
    Moon: gb([
      ['Moon in the Lagna: attractive, imaginative, caring and popular, with changeable moods. Physical strength follows the Moon’s strength — a waxing Moon is best.',
        'லக்னத்தில் சந்திரன்: வசீகரம், கற்பனை, அக்கறை, மக்கள் அபிமானம்; மனநிலை மாறும். உடல்வலிமை சந்திரனின் பலத்தைப் பொறுத்தது — வளர்பிறைச் சந்திரன் சிறப்பு.'],
      ['Moon in the 2nd: sweet speech, a good family life and income that fluctuates but grows; fond of good food. Wealth through public dealings, liquids or women.',
        '2-இல் சந்திரன்: இனிய பேச்சு, நல்ல குடும்ப வாழ்க்கை; ஏற்ற இறக்கத்துடன் வளரும் வருமானம்; நல்ல உணவில் விருப்பம். பொதுமக்கள், திரவப் பொருட்கள் மூலம் தனம்.'],
      ['Moon in the 3rd: an adventurous mind fond of travel and writing; caring siblings, artistic communication and courage that rises and falls with mood.',
        '3-இல் சந்திரன்: பயணம், எழுத்தை விரும்பும் சாகச மனம்; அக்கறையுள்ள சகோதரர்; கலைநயமான தொடர்புத் திறன்; மனநிலைக்கேற்ப தைரியம்.'],
      ['Moon in the 4th is excellent (dig bala): emotional security, a comfortable home, vehicles, a close bond with mother and real peace of mind.',
        '4-இல் சந்திரன் மிகச் சிறப்பு (திக் பலம்): மனப் பாதுகாப்பு, சுகமான வீடு, வாகனம், தாயுடன் நெருக்கம், உண்மையான மன அமைதி.'],
      ['Moon in the 5th: creative, intuitive and kind, fond of children and gifted in arts and teaching; romance is emotional and sincere.',
        '5-இல் சந்திரன்: படைப்பாற்றல், உள்ளுணர்வு, கருணை; குழந்தைகளிடம் அன்பு; கலை, கற்பித்தலில் திறமை; உண்மையான உணர்வுபூர்வமான காதல்.'],
      ['Moon in the 6th: work and rivals can cause emotional stress; health needs routine, especially digestion and fluids. Good for nursing, care and service work.',
        '6-இல் சந்திரன்: வேலையும் போட்டியாளர்களும் மன அழுத்தம் தரலாம்; உடல்நலத்திற்கு ஒழுங்கு தேவை — குறிப்பாக செரிமானம். செவிலியர், பராமரிப்பு, சேவைப் பணிகள் பொருந்தும்.'],
      ['Moon in the 7th: a caring, attractive partner and emotional fulfilment in marriage; success in dealing with the public and in business.',
        '7-இல் சந்திரன்: அக்கறையும் வசீகரமும் கொண்ட வாழ்க்கைத் துணை; திருமணத்தில் மன நிறைவு; பொதுமக்களுடனான தொடர்பிலும் வணிகத்திலும் வெற்றி.'],
      ['Moon in the 8th: emotional ups and downs, strong intuition and a private nature; interest in mysticism. Look after mental rest; gains through spouse or inheritance.',
        '8-இல் சந்திரன்: மன ஏற்றத் தாழ்வுகள், வலுவான உள்ளுணர்வு, தனிமை விரும்பும் இயல்பு; மறைஞானத்தில் ஆர்வம். மன ஓய்வு அவசியம்; துணை அல்லது பரம்பரை மூலம் லாபம்.'],
      ['Moon in the 9th: devout, generous and fortunate; pilgrimages and travel, the blessings of mother and teachers, and an idealistic outlook.',
        '9-இல் சந்திரன்: பக்தி, தாராளம், பாக்கியம்; புனிதப் பயணங்கள், தாய் மற்றும் குருவின் ஆசி, லட்சிய நோக்கு.'],
      ['Moon in the 10th: a public-facing career with popularity and some changes of job; success in people-oriented work, food, hospitality and administration.',
        '10-இல் சந்திரன்: மக்களுடன் தொடர்புடைய தொழில், புகழ்; சில வேலை மாற்றங்கள்; உணவு, விருந்தோம்பல், நிர்வாகம் போன்ற மக்கள் சார்ந்த பணிகளில் வெற்றி.'],
      ['Moon in the 11th: many friends and gains, wishes fulfilled and income through the public; socially popular and well supported.',
        '11-இல் சந்திரன்: பல நண்பர்கள், லாபங்கள், ஆசைகள் நிறைவேறுதல்; பொதுமக்கள் மூலம் வருமானம்; சமூகத்தில் அபிமானம்.'],
      ['Moon in the 12th: sensitive, imaginative and spiritual; expenses and sleep need managing, residence abroad is possible, and charity brings peace.',
        '12-இல் சந்திரன்: மென்மை, கற்பனை, ஆன்மிகம்; செலவும் உறக்கமும் கவனிக்கவும்; வெளிநாட்டு வாசம் வாய்ப்பு; தானம் மன அமைதி தரும்.']
    ]),
    Mars: gb([
      ['Mars in the Lagna: energetic, brave, athletic and quick to act, with leadership drive. Watch haste, heat and cuts. (A Chevvai dosham position from Lagna.)',
        'லக்னத்தில் செவ்வாய்: சுறுசுறுப்பு, வீரம், உடல் வலிமை, விரைவான செயல், தலைமை ஆர்வம். அவசரம், உஷ்ணம், காயங்கள் கவனிக்கவும். (லக்னத்திலிருந்து செவ்வாய் தோஷ நிலை.)'],
      ['Mars in the 2nd: forceful speech and earnings through effort, land or technical skill; family arguments are possible, so soften your words. (A Chevvai dosham position.)',
        '2-இல் செவ்வாய்: வேகமான பேச்சு; உழைப்பு, நிலம், தொழில்நுட்பத் திறன் மூலம் வருமானம்; குடும்பத்தில் வாக்குவாதம் வரலாம் — சொல்லில் மென்மை தேவை. (செவ்வாய் தோஷ நிலை.)'],
      ['Mars in the 3rd is a strong placement: very brave, competitive and sporty, with success in initiative, sales, defence and technical work.',
        '3-இல் செவ்வாய் வலுவான நிலை: மிகுந்த தைரியம், போட்டி மனம், விளையாட்டு ஆர்வம்; முன்முயற்சி, விற்பனை, பாதுகாப்பு, தொழில்நுட்பப் பணிகளில் வெற்றி.'],
      ['Mars in the 4th: land, property and vehicles through effort, but restlessness or arguments at home; drive carefully. (A Chevvai dosham position.)',
        '4-இல் செவ்வாய்: முயற்சியால் நிலம், சொத்து, வாகனம்; ஆனால் வீட்டில் அமைதியின்மை அல்லது வாக்குவாதம்; வாகனம் ஓட்டுவதில் கவனம். (செவ்வாய் தோஷ நிலை.)'],
      ['Mars in the 5th: a sharp, competitive intellect interested in sport, engineering and strategy; energetic children. Avoid impulsive investments.',
        '5-இல் செவ்வாய்: கூர்மையான போட்டி அறிவு; விளையாட்டு, பொறியியல், உத்தியில் ஆர்வம்; சுறுசுறுப்பான குழந்தைகள். திடீர் முதலீடுகள் தவிர்க்கவும்.'],
      ['Mars in the 6th is excellent: you defeat enemies and competition, with success in police, defence, surgery, sport and law; good immunity with discipline.',
        '6-இல் செவ்வாய் மிகச் சிறப்பு: எதிரிகளையும் போட்டியையும் வெல்வீர்கள்; காவல், பாதுகாப்புத் துறை, அறுவை சிகிச்சை, விளையாட்டு, சட்டத்தில் வெற்றி; ஒழுக்கத்துடன் நல்ல நோய் எதிர்ப்பு சக்தி.'],
      ['Mars in the 7th: a passionate, assertive partner; quarrels need restraint and business partnerships need clear terms. (A Chevvai dosham position — match charts carefully.)',
        '7-இல் செவ்வாய்: உணர்ச்சிமிக்க, உறுதியான வாழ்க்கைத் துணை; சண்டைகளில் கட்டுப்பாடு, கூட்டுத் தொழிலில் தெளிவான ஒப்பந்தம் தேவை. (செவ்வாய் தோஷ நிலை — பொருத்தம் கவனமாகப் பார்க்கவும்.)'],
      ['Mars in the 8th: caution with accidents, surgery and risky ventures; strong research or technical interest and sudden events. (A Chevvai dosham position.)',
        '8-இல் செவ்வாய்: விபத்து, அறுவை சிகிச்சை, ஆபத்தான முயற்சிகளில் எச்சரிக்கை; ஆராய்ச்சி அல்லது தொழில்நுட்ப ஆர்வம்; திடீர் நிகழ்வுகள். (செவ்வாய் தோஷ நிலை.)'],
      ['Mars in the 9th: bold beliefs and independence from father or teachers; fortune through effort, land and technical fields. Murugan worship is especially good.',
        '9-இல் செவ்வாய்: துணிச்சலான நம்பிக்கைகள்; தந்தை அல்லது குருவிடமிருந்து சுதந்திரம்; உழைப்பு, நிலம், தொழில்நுட்பத் துறைகள் மூலம் பாக்கியம். முருகன் வழிபாடு சிறப்பு.'],
      ['Mars in the 10th is powerful (dig bala): a strong career drive and leadership in engineering, police, defence, surgery, real estate or management.',
        '10-இல் செவ்வாய் வலிமையான நிலை (திக் பலம்): தீவிரமான தொழில் ஆர்வம்; பொறியியல், காவல், பாதுகாப்பு, அறுவை சிகிச்சை, நிலம், நிர்வாகத்தில் தலைமை.'],
      ['Mars in the 11th: gains through land, technical work and courage; ambitious and successful, with strong-willed elder siblings.',
        '11-இல் செவ்வாய்: நிலம், தொழில்நுட்பப் பணி, தைரியம் மூலம் லாபம்; லட்சியமும் வெற்றியும்; மன உறுதியுள்ள மூத்த சகோதரர்.'],
      ['Mars in the 12th: expenses on property or disputes, foreign travel and heat or sleep issues; hidden opponents. Spiritual discipline helps. (A Chevvai dosham position.)',
        '12-இல் செவ்வாய்: சொத்து அல்லது வழக்குகளுக்குச் செலவு; வெளிநாட்டுப் பயணம்; உஷ்ணம், உறக்கக் குறைபாடு; மறைமுக எதிரிகள். ஆன்மிக ஒழுக்கம் உதவும். (செவ்வாய் தோஷ நிலை.)']
    ]),
    Mercury: gb([
      ['Mercury in the Lagna (dig bala): intelligent, youthful, witty and communicative; good at calculation, trade and learning, and very adaptable.',
        'லக்னத்தில் புதன் (திக் பலம்): அறிவு, இளமை, நகைச்சுவை, பேச்சுத்திறன்; கணக்கு, வணிகம், கல்வியில் திறமை; எதற்கும் இணங்கும் தன்மை.'],
      ['Mercury in the 2nd: eloquent speech and income through business, accounts, teaching or writing; a good memory and a learned family.',
        '2-இல் புதன்: சொல்வன்மை; வணிகம், கணக்கியல், கற்பித்தல், எழுத்து மூலம் வருமானம்; நல்ல நினைவாற்றல், கல்வியறிவுள்ள குடும்பம்.'],
      ['Mercury in the 3rd: excellent communication — writing, media, IT and sales; skilful hands, short travels and good ties with siblings.',
        '3-இல் புதன்: சிறந்த தொடர்புத் திறன் — எழுத்து, ஊடகம், தகவல் தொழில்நுட்பம், விற்பனை; கைத்திறன், குறுகிய பயணங்கள், சகோதரருடன் நல்லுறவு.'],
      ['Mercury in the 4th: well educated, with a home full of books and learning; success in studies and property dealings, and peace through knowledge.',
        '4-இல் புதன்: நல்ல கல்வி; நூல்களும் கல்வியும் நிறைந்த வீடு; படிப்பிலும் சொத்து பரிவர்த்தனையிலும் வெற்றி; அறிவால் மன அமைதி.'],
      ['Mercury in the 5th: a sharp intellect with success in studies, mathematics, astrology and advisory work; clever children and good strategy.',
        '5-இல் புதன்: கூர்மையான அறிவு; படிப்பு, கணிதம், ஜோதிடம், ஆலோசனைப் பணிகளில் வெற்றி; புத்திசாலிக் குழந்தைகள்; நல்ல உத்தி.'],
      ['Mercury in the 6th: analytical and good in service, accounts, law and medicine; you defeat rivals with intelligence. Nervous strain or skin issues need care.',
        '6-இல் புதன்: ஆய்வுத் திறன்; சேவை, கணக்கியல், சட்டம், மருத்துவத்தில் சிறப்பு; அறிவால் எதிரிகளை வெல்வீர்கள். நரம்புச் சோர்வு, சருமப் பிரச்சினை கவனிக்கவும்.'],
      ['Mercury in the 7th: a youthful, intelligent partner and good communication in marriage; success in trade and business partnerships.',
        '7-இல் புதன்: இளமையும் அறிவும் கொண்ட வாழ்க்கைத் துணை; திருமணத்தில் நல்ல புரிதல்; வணிகம், கூட்டுத் தொழிலில் வெற்றி.'],
      ['Mercury in the 8th: research, investigation, insurance and occult study; a mentally active long life. Handle documents and nerves carefully.',
        '8-இல் புதன்: ஆராய்ச்சி, புலனாய்வு, காப்பீடு, மறைஞானக் கல்வி; மனச்சுறுசுறுப்புடன் நீண்ட ஆயுள். ஆவணங்களிலும் நரம்பு நலத்திலும் கவனம்.'],
      ['Mercury in the 9th: learned in scripture and philosophy; fortune through education, writing and travel, and good relations with teachers.',
        '9-இல் புதன்: சாஸ்திரம், தத்துவத்தில் கல்வி; கல்வி, எழுத்து, பயணம் மூலம் பாக்கியம்; குருவுடன் நல்லுறவு.'],
      ['Mercury in the 10th: a versatile career in business, communication, IT, banking, accounting or teaching; many skills and a good professional reputation.',
        '10-இல் புதன்: வணிகம், தொடர்பு, தகவல் தொழில்நுட்பம், வங்கி, கணக்கியல், கற்பித்தல் எனப் பல்துறைத் தொழில்; பல திறமைகள், நல்ல பெயர்.'],
      ['Mercury in the 11th: gains through trade, intellect and networks; many friends and more than one source of income.',
        '11-இல் புதன்: வணிகம், அறிவு, தொடர்புகள் மூலம் லாபம்; பல நண்பர்கள்; ஒன்றுக்கு மேற்பட்ட வருமான வழிகள்.'],
      ['Mercury in the 12th: spending on learning and travel, foreign connections and a private, imaginative mind; avoid overthinking and careless paperwork.',
        '12-இல் புதன்: கல்வி, பயணத்திற்கான செலவு; வெளிநாட்டுத் தொடர்பு; தனிமையான கற்பனை மனம்; அதிகச் சிந்தனையும் கவனக்குறைவான ஆவணப் பணியும் தவிர்க்கவும்.']
    ]),
    Jupiter: gb([
      ['Jupiter in the Lagna (dig bala) is a great protection: wise, respected, optimistic and generous, with good health and the nature of a teacher or adviser.',
        'லக்னத்தில் குரு (திக் பலம்) பெரும் பாதுகாப்பு: ஞானம், மதிப்பு, நம்பிக்கை, தாராளம்; நல்ல உடல்நலம்; ஆசிரியர் அல்லது ஆலோசகர் இயல்பு.'],
      ['Jupiter in the 2nd: a prosperous family, truthful and sweet speech, good savings and learning.',
        '2-இல் குரு: வளமான குடும்பம், உண்மையும் இனிமையும் கொண்ட பேச்சு, நல்ல சேமிப்பு, கல்வி.'],
      ['Jupiter in the 3rd: courage tempered by wisdom and success through writing and advice, though results need steady effort; few but good siblings.',
        '3-இல் குரு: ஞானத்துடன் கூடிய தைரியம்; எழுத்து, ஆலோசனை மூலம் வெற்றி — ஆனால் விடாமுயற்சி தேவை; குறைவான ஆனால் நல்ல சகோதரர்.'],
      ['Jupiter in the 4th: a happy home, good education, vehicles and property, a contented mind and mother’s blessings.',
        '4-இல் குரு: மகிழ்ச்சியான வீடு, நல்ல கல்வி, வாகனம், சொத்து, திருப்தியான மனம், தாயின் ஆசி.'],
      ['Jupiter in the 5th is very auspicious: intelligent and devout, blessed with good children, success in teaching and advice, and strong past merit.',
        '5-இல் குரு மிகவும் சுபம்: அறிவும் பக்தியும்; நல்ல குழந்தைப் பாக்கியம்; கற்பித்தல், ஆலோசனையில் வெற்றி; வலுவான பூர்வ புண்ணியம்.'],
      ['Jupiter in the 6th: victory over opponents through right conduct and success in service, law or medicine; watch weight, sugar and the liver, and manage debts.',
        '6-இல் குரு: நேர்மையான வழியில் எதிரிகளை வெல்வீர்கள்; சேவை, சட்டம், மருத்துவத்தில் வெற்றி; எடை, சர்க்கரை, கல்லீரல் கவனிக்கவும்; கடனை நிர்வகிக்கவும்.'],
      ['Jupiter in the 7th: a virtuous, wise partner and a harmonious marriage; good business partnerships and respect in society.',
        '7-இல் குரு: நற்குணமும் ஞானமும் கொண்ட வாழ்க்கைத் துணை; இணக்கமான திருமணம்; நல்ல கூட்டுத் தொழில்; சமூகத்தில் மரியாதை.'],
      ['Jupiter in the 8th: long life, interest in spiritual and occult research, and inheritance or hidden resources; results come after delays.',
        '8-இல் குரு: நீண்ட ஆயுள்; ஆன்மிக, மறைஞான ஆராய்ச்சியில் ஆர்வம்; பரம்பரைச் சொத்து அல்லது மறைந்த வளங்கள்; தாமதத்திற்குப் பின் பலன்.'],
      ['Jupiter in the 9th is very fortunate: religious, ethical and respected, with blessings from father and teachers, higher education and long journeys.',
        '9-இல் குரு மிகுந்த பாக்கியம்: சமய நம்பிக்கை, நெறி, மதிப்பு; தந்தை, குருவின் ஆசி; உயர்கல்வி, தூரப் பயணங்கள்.'],
      ['Jupiter in the 10th: a respected career in teaching, law, finance, advisory work, management or religion, with ethical leadership.',
        '10-இல் குரு: கல்வி, சட்டம், நிதி, ஆலோசனை, நிர்வாகம் அல்லது சமயப் பணியில் மதிப்பான தொழில்; நெறியான தலைமை.'],
      ['Jupiter in the 11th: abundant gains, influential friends and fulfilment of desires; supportive elder siblings.',
        '11-இல் குரு: ஏராளமான லாபம், செல்வாக்குள்ள நண்பர்கள், ஆசைகள் நிறைவேறுதல்; ஆதரவான மூத்த சகோதரர்.'],
      ['Jupiter in the 12th: charitable and spiritual, spending on good causes, possible settlement abroad and a pull towards moksha; budget carefully.',
        '12-இல் குரு: தானமும் ஆன்மிகமும்; நற்காரியங்களுக்குச் செலவு; வெளிநாட்டில் குடியேறும் வாய்ப்பு; மோட்ச நாட்டம்; கவனமாகத் திட்டமிட்டுச் செலவிடவும்.']
    ]),
    Venus: gb([
      ['Venus in the Lagna: charming, graceful and artistic, fond of comforts and beauty, with good taste and a harmony-seeking nature.',
        'லக்னத்தில் சுக்கிரன்: வசீகரம், நளினம், கலையுணர்வு; வசதி, அழகில் விருப்பம்; நல்ல ரசனை; இணக்கம் நாடும் இயல்பு.'],
      ['Venus in the 2nd: pleasant speech, wealth through arts, beauty or luxury goods, a happy family life and love of fine food.',
        '2-இல் சுக்கிரன்: இனிய பேச்சு; கலை, அழகு, ஆடம்பரப் பொருட்கள் மூலம் தனம்; மகிழ்ச்சியான குடும்பம்; சுவையான உணவில் விருப்பம்.'],
      ['Venus in the 3rd: artistic communication in music, design or media, pleasant siblings (especially sisters) and gentle courage.',
        '3-இல் சுக்கிரன்: இசை, வடிவமைப்பு, ஊடகத்தில் கலைநயமான வெளிப்பாடு; இனிய சகோதரர் (குறிப்பாக சகோதரிகள்); மென்மையான தைரியம்.'],
      ['Venus in the 4th is excellent: a comfortable home, vehicles, luxuries, property, a loving mother and domestic happiness.',
        '4-இல் சுக்கிரன் மிகச் சிறப்பு: சுகமான வீடு, வாகனம், ஆடம்பரம், சொத்து, அன்பான தாய், குடும்ப மகிழ்ச்சி.'],
      ['Venus in the 5th: romantic, creative and artistic, with talented children and success in entertainment and the arts.',
        '5-இல் சுக்கிரன்: காதல், படைப்பாற்றல், கலைத்திறன்; திறமையான குழந்தைகள்; பொழுதுபோக்கு, கலைத்துறையில் வெற்றி.'],
      ['Venus in the 6th gives mixed results: work in service linked with art or beauty, but friction in relationships; kidneys and blood sugar need care.',
        '6-இல் சுக்கிரன் கலவையான பலன்: கலை அல்லது அழகு சார்ந்த சேவைப் பணி; ஆனால் உறவுகளில் உரசல்; சிறுநீரகம், சர்க்கரை கவனிக்கவும்.'],
      ['Venus in the 7th: an attractive, loving partner and marital happiness when Venus is strong; business in arts or luxury. Avoid over-indulgence.',
        '7-இல் சுக்கிரன்: அழகும் அன்பும் கொண்ட வாழ்க்கைத் துணை; சுக்கிரன் பலமாக இருந்தால் திருமண மகிழ்ச்சி; கலை, ஆடம்பரத் தொழில். அளவுக்கு மீறிய சுகம் தவிர்க்கவும்.'],
      ['Venus in the 8th: gains through spouse or inheritance and a long life; interest in hidden knowledge. Keep relationships transparent.',
        '8-இல் சுக்கிரன்: துணை அல்லது பரம்பரை மூலம் லாபம்; நீண்ட ஆயுள்; மறைஞானத்தில் ஆர்வம். உறவுகளில் வெளிப்படைத்தன்மை காக்கவும்.'],
      ['Venus in the 9th: fortune through spouse and the arts, religious yet pleasure-loving, with foreign travel and a generous father.',
        '9-இல் சுக்கிரன்: வாழ்க்கைத் துணை, கலை மூலம் பாக்கியம்; பக்தியும் இன்ப நாட்டமும்; வெளிநாட்டுப் பயணம்; தாராள மனமுள்ள தந்தை.'],
      ['Venus in the 10th: a career in arts, beauty, fashion, hospitality, entertainment, finance or luxury goods, in a pleasant workplace.',
        '10-இல் சுக்கிரன்: கலை, அழகு, ஆடை, விருந்தோம்பல், பொழுதுபோக்கு, நிதி, ஆடம்பரப் பொருட்கள் துறையில் தொழில்; இனிய பணிச்சூழல்.'],
      ['Venus in the 11th: gains through arts, women and luxury trades, many friends and fulfilment of desires.',
        '11-இல் சுக்கிரன்: கலை, பெண்கள், ஆடம்பர வணிகம் மூலம் லாபம்; பல நண்பர்கள்; ஆசைகள் நிறைவேறுதல்.'],
      ['Venus in the 12th is classically good: comforts, pleasures of rest, foreign travel and devotion through art, though spending on luxuries must be watched.',
        '12-இல் சுக்கிரன் பாரம்பரியமாக நல்லது: சுகம், நல்ல ஓய்வு, வெளிநாட்டுப் பயணம், கலை வழி பக்தி; ஆனால் ஆடம்பரச் செலவு கவனிக்கவும்.']
    ]),
    Saturn: gb([
      ['Saturn in the Lagna: serious, hardworking and patient, with a slow start that builds into lasting success; very good if Saturn is in its own or exalted sign.',
        'லக்னத்தில் சனி: அடக்கம், கடின உழைப்பு, பொறுமை; மெதுவான தொடக்கம் நிலையான வெற்றியாக மாறும்; சனி ஆட்சி அல்லது உச்சம் பெற்றால் மிகச் சிறப்பு.'],
      ['Saturn in the 2nd: reserved speech, slow but steady wealth and family responsibilities; thrifty habits. Care for the teeth and eyes.',
        '2-இல் சனி: அளவான பேச்சு; மெதுவான ஆனால் நிலையான செல்வம்; குடும்பப் பொறுப்புகள்; சிக்கனம். பற்கள், கண்கள் கவனிக்கவும்.'],
      ['Saturn in the 3rd is a good placement: persistent courage, success through hard work and long-term effort that pays off.',
        '3-இல் சனி நல்ல நிலை: விடாமுயற்சியுடன் கூடிய தைரியம்; கடின உழைப்பால் வெற்றி; நீண்டகால முயற்சிக்குப் பலன்.'],
      ['Saturn in the 4th: domestic responsibilities, older or inherited property and a heavy mind at times; look after mother’s health and your own peace.',
        '4-இல் சனி: வீட்டுப் பொறுப்புகள்; பழைய அல்லது பரம்பரைச் சொத்து; சில நேரம் மனச்சுமை; தாயின் உடல்நலமும் உங்கள் மன அமைதியும் கவனிக்கவும்.'],
      ['Saturn in the 5th: a serious, practical thinker; some delay or concern regarding children, and disciplined studies bring results.',
        '5-இல் சனி: ஆழ்ந்த நடைமுறைச் சிந்தனை; குழந்தைகள் விஷயத்தில் சிறு தாமதம் அல்லது கவலை; ஒழுக்கமான படிப்பு பலன் தரும்.'],
      ['Saturn in the 6th is excellent: you defeat enemies, have strong resistance to illness and succeed in service, labour, law and industry.',
        '6-இல் சனி மிகச் சிறப்பு: எதிரிகளை வெல்வீர்கள்; நல்ல நோய் எதிர்ப்பு; சேவை, தொழிலாளர், சட்டம், தொழிற்சாலைப் பணிகளில் வெற்றி.'],
      ['Saturn in the 7th (dig bala): a mature, responsible partner; marriage may come later but tends to be stable. Business partnerships need patience.',
        '7-இல் சனி (திக் பலம்): முதிர்ச்சியும் பொறுப்பும் கொண்ட வாழ்க்கைத் துணை; திருமணம் சற்றுத் தாமதமாகலாம், ஆனால் நிலையானது. கூட்டுத் தொழிலில் பொறுமை தேவை.'],
      ['Saturn in the 8th: a long life with delays and chronic issues to manage; research, mining or insurance; inheritance after struggle.',
        '8-இல் சனி: நீண்ட ஆயுள்; தாமதங்களும் நீடித்த உடல்நலப் பிரச்சினைகளும் கவனிக்கப்பட வேண்டும்; ஆராய்ச்சி, சுரங்கம், காப்பீடு; போராட்டத்திற்குப் பின் பரம்பரைச் சொத்து.'],
      ['Saturn in the 9th: traditional yet questioning; fortune comes later in life, responsibilities towards father, and austere pilgrimages.',
        '9-இல் சனி: மரபைப் பின்பற்றினாலும் கேள்வி கேட்கும் மனம்; பாக்கியம் வாழ்வின் பிற்பகுதியில்; தந்தை மீதான பொறுப்புகள்; எளிமையான புனிதப் பயணங்கள்.'],
      ['Saturn in the 10th: a strong career built on discipline — a steady rise in administration, law, industry, engineering or public service, with real responsibility.',
        '10-இல் சனி: ஒழுக்கத்தால் கட்டமைக்கப்பட்ட வலுவான தொழில் — நிர்வாகம், சட்டம், தொழிற்சாலை, பொறியியல், பொதுச் சேவையில் நிலையான உயர்வு; பெரிய பொறுப்புகள்.'],
      ['Saturn in the 11th is a good placement: steady, long-term gains, older friends and wishes fulfilled late but surely.',
        '11-இல் சனி நல்ல நிலை: நிலையான நீண்டகால லாபம்; வயதில் மூத்த நண்பர்கள்; ஆசைகள் தாமதமாக ஆனால் உறுதியாக நிறைவேறும்.'],
      ['Saturn in the 12th: expenses, solitude or work abroad and possible sleep issues; spiritual discipline and service in hospitals or ashrams suit you.',
        '12-இல் சனி: செலவு, தனிமை அல்லது வெளிநாட்டுப் பணி; உறக்கக் குறைபாடு வரலாம்; ஆன்மிக ஒழுக்கம், மருத்துவமனை அல்லது ஆசிரமச் சேவை பொருந்தும்.']
    ]),
    Rahu: gb([
      ['Rahu in the Lagna: unconventional, ambitious and magnetic, with foreign interests and a strong drive to succeed; periods of confusion about identity can occur.',
        'லக்னத்தில் ராகு: வழக்கத்திற்கு மாறான இயல்பு, லட்சியம், கவர்ச்சி; வெளிநாட்டு ஆர்வம், வெற்றிக்கான தீவிர உந்துதல்; சில நேரம் தன்னைப் பற்றிய குழப்பம்.'],
      ['Rahu in the 2nd: unusual speech and income from foreign or unconventional sources; be careful with words, food habits and family disputes.',
        '2-இல் ராகு: வித்தியாசமான பேச்சு; வெளிநாடு அல்லது வழக்கத்திற்கு மாறான வழிகளில் வருமானம்; சொல், உணவுப் பழக்கம், குடும்பப் பிணக்குகளில் கவனம்.'],
      ['Rahu in the 3rd is a strong placement: bold and adventurous, with success in media, technology and enterprise.',
        '3-இல் ராகு வலுவான நிலை: துணிச்சலும் சாகசமும்; ஊடகம், தொழில்நுட்பம், தொழில் முயற்சிகளில் வெற்றி.'],
      ['Rahu in the 4th: restlessness at home, unusual domestic situations or property abroad; look after mother’s health.',
        '4-இல் ராகு: வீட்டில் அமைதியின்மை; வித்தியாசமான குடும்பச் சூழல் அல்லது வெளிநாட்டுச் சொத்து; தாயின் உடல்நலம் கவனிக்கவும்.'],
      ['Rahu in the 5th: unconventional intelligence with interest in technology or the occult; concerns or delays about children, and speculation needs caution.',
        '5-இல் ராகு: வழக்கத்திற்கு மாறான அறிவு; தொழில்நுட்பம் அல்லது மறைஞானத்தில் ஆர்வம்; குழந்தைகள் விஷயத்தில் கவலை அல்லது தாமதம்; ஊக வணிகத்தில் எச்சரிக்கை.'],
      ['Rahu in the 6th is excellent: you overcome enemies and succeed in competition, service, medicine and technology.',
        '6-இல் ராகு மிகச் சிறப்பு: எதிரிகளை வெல்வீர்கள்; போட்டி, சேவை, மருத்துவம், தொழில்நுட்பத்தில் வெற்றி.'],
      ['Rahu in the 7th: an unconventional or foreign partner; marriage needs understanding and trust. Business with foreigners is possible.',
        '7-இல் ராகு: வித்தியாசமான அல்லது வேற்றுப் பின்னணி கொண்ட வாழ்க்கைத் துணை; திருமணத்தில் புரிதலும் நம்பிக்கையும் தேவை. வெளிநாட்டவருடன் வணிக வாய்ப்பு.'],
      ['Rahu in the 8th: sudden events and interest in research and the occult; have regular health checks and handle inheritance and insurance carefully.',
        '8-இல் ராகு: திடீர் நிகழ்வுகள்; ஆராய்ச்சி, மறைஞானத்தில் ஆர்வம்; முறையான உடல் பரிசோதனை; பரம்பரைச் சொத்து, காப்பீட்டில் கவனம்.'],
      ['Rahu in the 9th: unorthodox beliefs, foreign travel and fortune abroad; differences with father or teachers are possible.',
        '9-இல் ராகு: மரபு மீறிய நம்பிக்கைகள்; வெளிநாட்டுப் பயணம், வெளிநாட்டில் பாக்கியம்; தந்தை அல்லது குருவுடன் கருத்து வேறுபாடு வரலாம்.'],
      ['Rahu in the 10th: an ambitious career in technology, politics, media or foreign companies, with the potential for a sudden rise.',
        '10-இல் ராகு: தொழில்நுட்பம், அரசியல், ஊடகம், வெளிநாட்டு நிறுவனங்களில் லட்சியத் தொழில்; திடீர் உயர்வு வாய்ப்பு.'],
      ['Rahu in the 11th is very good: large gains through technology, foreign sources and networks, and ambitions fulfilled.',
        '11-இல் ராகு மிகவும் நல்லது: தொழில்நுட்பம், வெளிநாடு, தொடர்புகள் மூலம் பெரும் லாபம்; லட்சியங்கள் நிறைவேறும்.'],
      ['Rahu in the 12th: foreign residence, expenses and sleep issues, with spiritual seeking; avoid secretive dealings.',
        '12-இல் ராகு: வெளிநாட்டு வாசம், செலவு, உறக்கக் குறைபாடு; ஆன்மிகத் தேடல்; ரகசிய பரிவர்த்தனைகள் தவிர்க்கவும்.']
    ]),
    Ketu: gb([
      ['Ketu in the Lagna: spiritual, intuitive and detached, with an unusual personality and an introspective mind; take care of the head and general health.',
        'லக்னத்தில் கேது: ஆன்மிகம், உள்ளுணர்வு, பற்றின்மை; தனித்துவமான ஆளுமை, உள்நோக்கும் மனம்; தலை மற்றும் பொது உடல்நலம் கவனிக்கவும்.'],
      ['Ketu in the 2nd: blunt speech, detachment from family wealth and irregular income; care with the teeth, eyes and words.',
        '2-இல் கேது: நேரடியான கடும் பேச்சு; குடும்பச் சொத்தில் பற்றின்மை; ஒழுங்கற்ற வருமானம்; பற்கள், கண்கள், சொற்களில் கவனம்.'],
      ['Ketu in the 3rd is a good placement: spiritual courage, success through your own effort and skill in subtle or technical subjects.',
        '3-இல் கேது நல்ல நிலை: ஆன்மிகத் தைரியம்; சுயமுயற்சியால் வெற்றி; நுட்பமான அல்லது தொழில்நுட்பத் துறைகளில் திறமை.'],
      ['Ketu in the 4th: detachment from comforts and changes of residence; mother’s health needs care, and inner peace comes through spirituality.',
        '4-இல் கேது: சுகங்களில் பற்றின்மை; இருப்பிட மாற்றங்கள்; தாயின் உடல்நலம் கவனிக்கவும்; ஆன்மிகம் மூலம் மன அமைதி.'],
      ['Ketu in the 5th: spiritual intelligence, intuition and success with mantra; some concern about children is possible.',
        '5-இல் கேது: ஆன்மிக அறிவு, உள்ளுணர்வு, மந்திர சித்தி; குழந்தைகள் விஷயத்தில் சிறு கவலை வரலாம்.'],
      ['Ketu in the 6th is excellent: victory over enemies and a gift for healing, medicine and research.',
        '6-இல் கேது மிகச் சிறப்பு: எதிரிகள் மீது வெற்றி; குணப்படுத்தல், மருத்துவம், ஆராய்ச்சியில் திறமை.'],
      ['Ketu in the 7th: a spiritual or detached partner; misunderstandings need open talk, and partnerships need clarity.',
        '7-இல் கேது: ஆன்மிக நாட்டம் அல்லது பற்றின்மை கொண்ட வாழ்க்கைத் துணை; தவறான புரிதல்களுக்கு மனம் திறந்த பேச்சு தேவை; கூட்டுத் தொழிலில் தெளிவு அவசியம்.'],
      ['Ketu in the 8th: mysticism, research and sudden events; good for occult and moksha studies; look after the lower body.',
        '8-இல் கேது: மறைஞானம், ஆராய்ச்சி, திடீர் நிகழ்வுகள்; மோட்ச, மறைஞானக் கல்விக்கு நல்லது; உடலின் கீழ்ப்பகுதி நலம் கவனிக்கவும்.'],
      ['Ketu in the 9th: spiritual and drawn to pilgrimage and renunciation, with unorthodox beliefs; care for father’s health.',
        '9-இல் கேது: ஆன்மிகம், புனிதப் பயணம், துறவு நாட்டம்; மரபு மீறிய நம்பிக்கைகள்; தந்தையின் உடல்நலம் கவனிக்கவும்.'],
      ['Ketu in the 10th: an unusual career in technical, research or spiritual work, with sudden changes and detachment from status.',
        '10-இல் கேது: தொழில்நுட்பம், ஆராய்ச்சி அல்லது ஆன்மிகப் பணியில் வித்தியாசமான தொழில்; திடீர் மாற்றங்கள்; அந்தஸ்தில் பற்றின்மை.'],
      ['Ketu in the 11th: gains through technical or spiritual means and fulfilment of desires, especially later in life.',
        '11-இல் கேது: தொழில்நுட்ப அல்லது ஆன்மிக வழிகளில் லாபம்; குறிப்பாக வாழ்வின் பிற்பகுதியில் ஆசைகள் நிறைவேறும்.'],
      ['Ketu in the 12th, the moksha karaka in the house of liberation: deep spirituality, charity and freedom from attachment; expenses and foreign lands.',
        '12-இல் கேது — மோட்ச ஸ்தானத்தில் மோட்சகாரகன்: ஆழ்ந்த ஆன்மிகம், தானம், பற்றின்மை; செலவு, வெளிநாடு.']
    ])
  };

  /* ================================================================ DIGNITY & PLACEMENT TEMPLATES */
  K.dignityText = {
    exalted: { en: '{p} is exalted (ucham), giving its strongest and most generous results in the matters it rules.', ta: '{p} உச்சம் பெற்றுள்ளார்; தான் ஆளும் விஷயங்களில் மிக வலுவான, தாராளமான பலன்களைத் தருவார்.' },
    moolatrikona: { en: '{p} is in its moolatrikona, nearly as strong as exaltation; its results are dependable and purposeful.', ta: '{p} மூலத்திரிகோணத்தில் உள்ளார் — உச்சத்திற்கு இணையான பலம்; நம்பகமான, நோக்கமுள்ள பலன்கள்.' },
    own: { en: '{p} is in its own sign (aatchi): confident and at home, it protects the houses it rules.', ta: '{p} ஆட்சி பெற்றுள்ளார்; சொந்த வீட்டில் உறுதியாக இருந்து தான் ஆளும் வீடுகளைக் காப்பார்.' },
    friend: { en: '{p} is in a friendly sign (natpu): well supported, it gives good results for reasonable effort.', ta: '{p} நட்பு வீட்டில் உள்ளார்; ஆதரவுடன், நியாயமான முயற்சிக்கு நல்ல பலன் தருவார்.' },
    neutral: { en: '{p} is in a neutral sign (samam): results are moderate and depend on its house and the aspects it receives.', ta: '{p} சம வீட்டில் உள்ளார்; பலன் மிதமானது — இருக்கும் வீடும் பெறும் பார்வைகளும் தீர்மானிக்கும்.' },
    enemy: { en: '{p} is in an enemy’s sign (pagai): its results come with friction or extra effort, and remedies help.', ta: '{p} பகை வீட்டில் உள்ளார்; பலன்கள் உரசலுடன் அல்லது கூடுதல் முயற்சியுடன் வரும்; பரிகாரம் உதவும்.' },
    debilitated: { en: '{p} is debilitated (neecham): its matters need patience and conscious effort. See the Yogas tab for any neecha bhanga (cancellation).', ta: '{p} நீசம் பெற்றுள்ளார்; அவர் குறிக்கும் விஷயங்களில் பொறுமையும் விழிப்பான முயற்சியும் தேவை. நீச பங்கம் உள்ளதா என யோகங்கள் பகுதியில் பார்க்கவும்.' },
    node: { en: '{p} owns no sign; it gives the results of its sign lord {x} and of the house it occupies.', ta: '{p}-க்கு சொந்த வீடு இல்லை; அது இருக்கும் ராசியின் அதிபதி {x} மற்றும் இருக்கும் வீட்டின் பலனைத் தரும்.' },
    combust: { en: '{p} is combust (too close to the Sun), which reduces its independent strength.', ta: '{p} அஸ்தங்கம் (சூரியனுக்கு மிக அருகில்) — தனித்த பலம் குறையும்.' },
    retro: { en: '{p} is retrograde (vakram): its results are inward, revisited or delayed, yet often intensified.', ta: '{p} வக்கிரம் பெற்றுள்ளார்; பலன்கள் உள்நோக்கியதாக, மீண்டும் மீண்டும் வருவதாக அல்லது தாமதமாக இருந்தாலும் தீவிரமாக இருக்கும்.' },
    vargottama: { en: '{p} is vargottama (same sign in Rasi and Navamsam), which steadies and strengthens it.', ta: '{p} வர்கோத்தமம் (ராசியிலும் நவாம்சத்திலும் ஒரே ராசி) — நிலைத்த பலம் தரும்.' }
  };
  K.lordPlace = {
    intro: { en: 'The lord of the {h} house, {p}, sits in the {x} house ({y}).', ta: '{h}-ஆம் வீட்டு அதிபதி {p}, {x}-ஆம் வீட்டில் ({y}) அமர்ந்துள்ளார்.' },
    own: { en: 'Placed in its own house, it guards these matters strongly.', ta: 'தன் சொந்த வீட்டிலேயே இருப்பதால் இந்த விஷயங்களை வலுவாகக் காப்பார்.' },
    lagna: { en: 'In the Lagna, the most powerful point of the chart, its matters become central to your life and identity.', ta: 'ஜாதகத்தின் மிக வலிமையான இடமான லக்னத்தில் இருப்பதால், இவ்விஷயங்கள் உங்கள் வாழ்க்கையின் மையமாகும்.' },
    kendra: { en: 'A kendra (angle) gives it strength and visibility; results come through steady personal effort.', ta: 'கேந்திரத்தில் இருப்பதால் பலமும் வெளிப்படைத்தன்மையும் பெறுகிறார்; நிலையான சுயமுயற்சியால் பலன்.' },
    trikona: { en: 'A trikona (trine) is fortunate: grace, past merit and timely support help these matters.', ta: 'திரிகோணத்தில் இருப்பது பாக்கியம்: இறையருள், பூர்வ புண்ணியம், உரிய நேர உதவி இவ்விஷயங்களுக்குத் துணை.' },
    dhana: { en: 'A wealth house links these matters with income, family resources and gains.', ta: 'தன/லாப வீட்டில் இருப்பதால் இவ்விஷயங்கள் வருமானம், குடும்ப வளம், லாபத்தோடு இணைகின்றன.' },
    upachaya: { en: 'The 3rd is a house of growth (upachaya): results improve with courage, communication and persistence over time.', ta: '3-ஆம் வீடு வளர்ச்சி ஸ்தானம் (உபஜெயம்): தைரியம், தொடர்பு, விடாமுயற்சியால் காலப்போக்கில் பலன் கூடும்.' },
    six: { en: 'The 6th brings competition and service: success comes by working hard, managing health and settling disputes.', ta: '6-ஆம் வீடு போட்டியும் சேவையும் குறிக்கும்: கடின உழைப்பு, உடல்நலப் பராமரிப்பு, பிணக்குகளைத் தீர்ப்பதால் வெற்றி.' },
    eight: { en: 'The 8th makes results hidden or delayed, with sudden turns; patience, research and insurance help.', ta: '8-ஆம் வீடு பலன்களை மறைவாக அல்லது தாமதமாக, திடீர் திருப்பங்களுடன் தரும்; பொறுமை, ஆராய்ச்சி, காப்பீடு உதவும்.' },
    twelve: { en: 'The 12th connects these matters with expenses, foreign lands or spiritual life; plan and spend wisely.', ta: '12-ஆம் வீடு இவ்விஷயங்களை செலவு, வெளிநாடு அல்லது ஆன்மிகத்தோடு இணைக்கிறது; திட்டமிட்டு செலவிடவும்.' }
  };

  /* ================================================================ CAREER */
  K.career = {
    signStyle: gb([
      ['With Aries on the 10th, work must feel like a mission: pioneering, independent roles with quick decisions suit you — engineering, defence, sport, surgery or your own venture.',
        '10-ஆம் வீடு மேஷம்: தொழில் ஒரு லட்சியமாக இருக்க வேண்டும்; விரைவான முடிவுகள் தேவைப்படும் சுதந்திரமான முன்னோடிப் பணிகள் — பொறியியல், பாதுகாப்புத் துறை, விளையாட்டு, அறுவை சிகிச்சை, சொந்தத் தொழில்.'],
      ['With Taurus on the 10th, you build value steadily: finance, banking, food, agriculture, arts and luxury goods suit you, and reliability becomes your reputation.',
        '10-ஆம் வீடு ரிஷபம்: நிதானமாக மதிப்பை உருவாக்குவீர்கள்; நிதி, வங்கி, உணவு, விவசாயம், கலை, ஆடம்பரப் பொருட்கள் பொருந்தும்; நம்பகத்தன்மையே உங்கள் அடையாளம்.'],
      ['With Gemini on the 10th, communication and variety drive your work: trade, media, IT, teaching, writing and sales, often with more than one role at a time.',
        '10-ஆம் வீடு மிதுனம்: தொடர்பும் பல்வகைமையும் தொழிலை இயக்கும்; வணிகம், ஊடகம், தகவல் தொழில்நுட்பம், கற்பித்தல், எழுத்து, விற்பனை — பெரும்பாலும் ஒரே நேரத்தில் பல பொறுப்புகள்.'],
      ['With Cancer on the 10th, caring, public-facing work suits you: hospitality, nursing, food, real estate, shipping, public relations and social welfare.',
        '10-ஆம் வீடு கடகம்: அக்கறையுடன் மக்களைச் சந்திக்கும் பணிகள் பொருந்தும்; விருந்தோம்பல், செவிலியர், உணவு, நிலம், கப்பல், மக்கள் தொடர்பு, சமூக நலன்.'],
      ['With Leo on the 10th, you are made for authority: government, administration, management and politics; you lead from the front and want your work recognised.',
        '10-ஆம் வீடு சிம்மம்: அதிகாரத்திற்காகவே பிறந்தவர்; அரசு, நிர்வாகம், மேலாண்மை, அரசியல்; முன்னின்று வழிநடத்துவீர்கள், உழைப்புக்கு அங்கீகாரம் விரும்புவீர்கள்.'],
      ['With Virgo on the 10th, analysis and service are your strengths: accounts, audit, healthcare, editing, quality, data and consulting — precision earns trust.',
        '10-ஆம் வீடு கன்னி: ஆய்வும் சேவையும் உங்கள் பலம்; கணக்கியல், தணிக்கை, சுகாதாரம், பதிப்பு, தரக்கட்டுப்பாடு, தரவு, ஆலோசனை — துல்லியம் நம்பிக்கை தரும்.'],
      ['With Libra on the 10th, partnership and balance shape your career: law, diplomacy, design, fashion, trade, human resources and negotiation.',
        '10-ஆம் வீடு துலாம்: கூட்டுறவும் சமநிலையும் தொழிலை வடிவமைக்கும்; சட்டம், ராஜதந்திரம், வடிவமைப்பு, ஆடைத் துறை, வணிகம், மனிதவளம், பேச்சுவார்த்தை.'],
      ['With Scorpio on the 10th, you excel where depth and nerve are needed: research, investigation, surgery, insurance, mining, intelligence and psychology.',
        '10-ஆம் வீடு விருச்சிகம்: ஆழமும் துணிவும் தேவைப்படும் இடங்களில் சிறப்பு; ஆராய்ச்சி, புலனாய்வு, அறுவை சிகிச்சை, காப்பீடு, சுரங்கம், உளவுத்துறை, உளவியல்.'],
      ['With Sagittarius on the 10th, wisdom is your work: teaching, law, religion, consulting, finance, publishing, travel and international roles.',
        '10-ஆம் வீடு தனுசு: ஞானமே உங்கள் தொழில்; கற்பித்தல், சட்டம், சமயம், ஆலோசனை, நிதி, பதிப்பகம், பயணம், சர்வதேசப் பணிகள்.'],
      ['With Capricorn on the 10th, you build structures that last: administration, civil services, industry, engineering, construction and long-term enterprises, with a steady rise.',
        '10-ஆம் வீடு மகரம்: நிலைக்கும் அமைப்புகளை உருவாக்குவீர்கள்; நிர்வாகம், குடிமைப் பணி, தொழிற்சாலை, பொறியியல், கட்டுமானம், நீண்டகாலத் தொழில்கள் — நிலையான உயர்வு.'],
      ['With Aquarius on the 10th, systems and society call you: technology, science, large organisations, social causes, networks and research.',
        '10-ஆம் வீடு கும்பம்: அமைப்புகளும் சமூகமும் அழைக்கும்; தொழில்நுட்பம், அறிவியல், பெரிய நிறுவனங்கள், சமூகப் பணிகள், தொடர்பு வலைகள், ஆராய்ச்சி.'],
      ['With Pisces on the 10th, compassion and imagination lead: medicine, healing, spirituality, arts, film, marine work, charity and education.',
        '10-ஆம் வீடு மீனம்: கருணையும் கற்பனையும் வழிநடத்தும்; மருத்துவம், குணப்படுத்தல், ஆன்மிகம், கலை, திரைப்படம், கடல்சார் பணி, அறப்பணி, கல்வி.']
    ]),
    fields: {
      Sun: { en: 'government service, administration, politics, medicine, management, the power sector', ta: 'அரசுப் பணி, நிர்வாகம், அரசியல், மருத்துவம், மேலாண்மை, மின்சக்தித் துறை' },
      Moon: { en: 'hospitality, nursing, food and dairy, travel, shipping, public relations, psychology', ta: 'விருந்தோம்பல், செவிலியர், உணவு மற்றும் பால் பொருட்கள், பயணம், கப்பல், மக்கள் தொடர்பு, உளவியல்' },
      Mars: { en: 'engineering, police, armed forces, surgery, sport, real estate, mechanical and electrical work', ta: 'பொறியியல், காவல்துறை, ராணுவம், அறுவை சிகிச்சை, விளையாட்டு, நிலம், இயந்திர மற்றும் மின் பணிகள்' },
      Mercury: { en: 'business, accounting, banking, IT, writing, journalism, teaching, trading', ta: 'வணிகம், கணக்கியல், வங்கி, தகவல் தொழில்நுட்பம், எழுத்து, பத்திரிகை, கற்பித்தல், வர்த்தகம்' },
      Jupiter: { en: 'teaching, law and the judiciary, finance, banking, advisory work, priesthood, management', ta: 'கற்பித்தல், சட்டம் மற்றும் நீதித்துறை, நிதி, வங்கி, ஆலோசனை, புரோகிதம், நிர்வாகம்' },
      Venus: { en: 'arts, music, film, fashion, beauty, hospitality, luxury goods, vehicles, design', ta: 'கலை, இசை, திரைப்படம், ஆடைத் துறை, அழகுக்கலை, விருந்தோம்பல், ஆடம்பரப் பொருட்கள், வாகனங்கள், வடிவமைப்பு' },
      Saturn: { en: 'industry, labour management, civil engineering, mining, oil, agriculture, law, public administration', ta: 'தொழிற்சாலை, தொழிலாளர் மேலாண்மை, கட்டுமானப் பொறியியல், சுரங்கம், எண்ணெய், விவசாயம், சட்டம், பொது நிர்வாகம்' },
      Rahu: { en: 'technology, aviation, foreign companies, research, politics, pharmaceuticals, media', ta: 'தொழில்நுட்பம், விமானத் துறை, வெளிநாட்டு நிறுவனங்கள், ஆராய்ச்சி, அரசியல், மருந்துத் துறை, ஊடகம்' },
      Ketu: { en: 'research, spirituality, alternative healing, programming, astrology, mathematics', ta: 'ஆராய்ச்சி, ஆன்மிகம், மாற்று மருத்துவம், நிரலாக்கம், ஜோதிடம், கணிதம்' }
    },
    fieldsLine: { en: 'Fields linked to the 10th lord {p}: {x}.', ta: '10-ஆம் அதிபதி {p} குறிக்கும் துறைகள்: {x}.' },
    occupants: { en: 'Planets in the 10th add their own fields — {x}.', ta: '10-ஆம் வீட்டில் உள்ள கிரகங்கள் தங்கள் துறைகளைச் சேர்க்கின்றன — {x}.' },
    empty: { en: 'No planet occupies the 10th house, so its lord {p} tells most of the career story.', ta: '10-ஆம் வீட்டில் கிரகம் இல்லை; எனவே அதன் அதிபதி {p} தொழில் போக்கைப் பெரும்பாலும் சொல்கிறார்.' },
    sun: {
      strong: { en: 'The Sun, karaka of status, is strong: authority, government links and recognition from superiors come more easily.', ta: 'அந்தஸ்துக் காரகன் சூரியன் பலமாக உள்ளார்: அதிகாரம், அரசுத் தொடர்பு, மேலதிகாரிகளின் அங்கீகாரம் எளிதாக வரும்.' },
      mid: { en: 'The Sun is moderately placed: recognition comes in proportion to visible effort, so take on responsibility willingly.', ta: 'சூரியன் மிதமான நிலையில்: வெளிப்படையான உழைப்புக்கு ஏற்ப அங்கீகாரம்; பொறுப்புகளை மனமுவந்து ஏற்றுக்கொள்ளுங்கள்.' },
      weak: { en: 'The Sun is weak: build confidence steadily, avoid ego clashes with bosses and keep your official paperwork in order.', ta: 'சூரியன் பலவீனம்: தன்னம்பிக்கையைப் படிப்படியாக வளர்க்கவும்; மேலதிகாரிகளுடன் அகந்தை மோதல் தவிர்க்கவும்; அரசு ஆவணங்களை ஒழுங்காக வைத்திருங்கள்.' }
    },
    saturn: {
      strong: { en: 'Saturn, karaka of work and service, is strong: discipline, long service and steady promotions build a durable career.', ta: 'தொழில், சேவைக் காரகன் சனி பலமாக உள்ளார்: ஒழுக்கம், நீண்ட சேவை, நிலையான பதவி உயர்வுகள் உறுதியான தொழிலை உருவாக்கும்.' },
      mid: { en: 'Saturn is moderately placed: results grow with consistency — routines, skills and patience matter more than shortcuts.', ta: 'சனி மிதமான நிலையில்: தொடர் முயற்சியால் பலன் பெருகும் — குறுக்கு வழிகளை விட ஒழுங்கும் திறமையும் பொறுமையும் முக்கியம்.' },
      weak: { en: 'Saturn is weak: expect some early delays in your career; they turn into lasting success once routines are fixed and hard work is respected.', ta: 'சனி பலவீனம்: தொழிலின் தொடக்கத்தில் சில தாமதங்கள்; ஒழுங்கும் உழைப்பின் மீது மரியாதையும் வந்தபின் அவை நிலையான வெற்றியாக மாறும்.' }
    }
  };

  /* ================================================================ WEALTH */
  K.wealth = {
    style: {
      Sun: { en: 'With the Sun ruling the 2nd, money follows status: income through authority, government or the family name, with spending on dignity.', ta: '2-ஆம் அதிபதி சூரியன்: அந்தஸ்தைத் தொடர்ந்து பணம் — அதிகாரம், அரசு, குடும்பப் பெயர் மூலம் வருமானம்; கௌரவத்திற்கான செலவு.' },
      Moon: { en: 'With the Moon ruling the 2nd, income rises and falls like the tides but grows through public dealings; you save for family security.', ta: '2-ஆம் அதிபதி சந்திரன்: அலை போல் ஏறி இறங்கும் வருமானம், பொதுமக்கள் தொடர்பால் பெருகும்; குடும்பப் பாதுகாப்புக்காகச் சேமிப்பீர்கள்.' },
      Mars: { en: 'With Mars ruling the 2nd, you earn through effort, land and technical skill; watch impulsive spending and arguments over money.', ta: '2-ஆம் அதிபதி செவ்வாய்: உழைப்பு, நிலம், தொழில்நுட்பத் திறன் மூலம் சம்பாத்தியம்; திடீர்ச் செலவுகளையும் பணம் சார்ந்த வாக்குவாதங்களையும் தவிர்க்கவும்.' },
      Mercury: { en: 'With Mercury ruling the 2nd, wealth comes through trade, calculation and communication; careful budgeting is your strength.', ta: '2-ஆம் அதிபதி புதன்: வணிகம், கணக்கு, தொடர்புத் திறன் மூலம் செல்வம்; கவனமான வரவு-செலவுத் திட்டம் உங்கள் பலம்.' },
      Jupiter: { en: 'With Jupiter ruling the 2nd, wealth grows through wisdom, savings, banking and teaching; you are generous and prosperity is steady.', ta: '2-ஆம் அதிபதி குரு: ஞானம், சேமிப்பு, வங்கி, கல்வி மூலம் செல்வம் வளரும்; தாராள மனம்; நிலையான வளம்.' },
      Venus: { en: 'With Venus ruling the 2nd, money comes through the arts, beauty, luxury trades and partnerships; you enjoy spending on comfort.', ta: '2-ஆம் அதிபதி சுக்கிரன்: கலை, அழகு, ஆடம்பர வணிகம், கூட்டுறவு மூலம் பணம்; வசதிக்காகச் செலவிட விரும்புவீர்கள்.' },
      Saturn: { en: 'With Saturn ruling the 2nd, wealth gathers slowly and surely through thrift, property and long-term investment; prosperity peaks later in life.', ta: '2-ஆம் அதிபதி சனி: சிக்கனம், சொத்து, நீண்டகால முதலீடு மூலம் மெதுவாக உறுதியாகச் சேரும் செல்வம்; வாழ்வின் பிற்பகுதியில் உச்ச வளம்.' }
    },
    jupiter: {
      strong: { en: 'Jupiter, karaka of wealth and wisdom, is strong — a classic sign of savings, good counsel and protection in money matters.', ta: 'தன, ஞானக் காரகன் குரு பலமாக உள்ளார் — சேமிப்பு, நல்ல ஆலோசனை, பணவிஷயத்தில் பாதுகாப்புக்கான அடையாளம்.' },
      mid: { en: 'Jupiter is moderately placed: wealth grows best through steady saving, education and ethical dealings.', ta: 'குரு மிதமான நிலையில்: நிலையான சேமிப்பு, கல்வி, நேர்மையான பரிவர்த்தனைகள் மூலம் செல்வம் சிறப்பாக வளரும்.' },
      weak: { en: 'Jupiter is weak: avoid lending without documents and speculative schemes, seek trusted financial advice and give to charity regularly.', ta: 'குரு பலவீனம்: ஆவணமின்றி கடன் கொடுப்பதையும் ஊகத் திட்டங்களையும் தவிர்க்கவும்; நம்பகமான நிதி ஆலோசனை பெறவும்; தொடர்ந்து தானம் செய்யவும்.' }
    },
    dhanaYes: { en: 'Dhana yoga: {x}. This link between the houses of wealth and gains supports accumulation over time.', ta: 'தன யோகம்: {x}. தன, லாப வீடுகளின் இந்தத் தொடர்பு காலப்போக்கில் செல்வம் சேர உதவும்.' },
    dhanaNo: { en: 'The 2nd and 11th lords are not directly linked, so wealth builds through the steady effort their separate placements describe.', ta: '2, 11-ஆம் அதிபதிகளுக்கு நேரடித் தொடர்பு இல்லை; அவர்களின் தனித்த நிலைகள் காட்டும் நிலையான முயற்சியால் செல்வம் சேரும்.' },
    linkConj: { en: '{p} (2nd lord) and {q} (11th lord) are together in {s}', ta: '2-ஆம் அதிபதி {p}-உம் 11-ஆம் அதிபதி {q}-உம் {sl} இணைந்துள்ளனர்' },
    linkExchange: { en: '{p} (2nd lord) and {q} (11th lord) have exchanged signs (parivartana)', ta: '2-ஆம் அதிபதி {p}-உம் 11-ஆம் அதிபதி {q}-உம் பரிவர்த்தனை பெற்றுள்ளனர்' },
    linkAspect: { en: '{p} (2nd lord) and {q} (11th lord) aspect each other', ta: '2-ஆம் அதிபதி {p}-உம் 11-ஆம் அதிபதி {q}-உம் ஒருவரையொருவர் பார்க்கின்றனர்' },
    linkInHouse: { en: 'the {x} lord {p} sits in the {y} house', ta: '{x}-ஆம் அதிபதி {p}, {y}-ஆம் வீட்டில் உள்ளார்' },
    linkSame: { en: '{p} rules both the 2nd and the 11th and is well placed', ta: '{p} 2, 11 ஆகிய இரு வீடுகளுக்கும் அதிபதியாகி நல்ல நிலையில் உள்ளார்' }
  };

  /* ================================================================ MARRIAGE */
  K.marriage = {
    partner: gb([
      ['Aries on the 7th: an energetic, independent and direct partner. The relationship is lively; patience and personal space keep it warm.',
        '7-ஆம் வீடு மேஷம்: சுறுசுறுப்பான, சுதந்திரமான, நேரடியான வாழ்க்கைத் துணை. உற்சாகமான உறவு; பொறுமையும் தனிப்பட்ட இடமும் அன்பைக் காக்கும்.'],
      ['Taurus on the 7th: a loyal, attractive and comfort-loving partner who values stability and home; occasional stubbornness on both sides needs gentleness.',
        '7-ஆம் வீடு ரிஷபம்: விசுவாசமான, அழகான, வசதி விரும்பும் வாழ்க்கைத் துணை; நிலைத்தன்மையும் இல்லறமும் முக்கியம்; இருவரின் பிடிவாதத்திற்கும் மென்மை தேவை.'],
      ['Gemini on the 7th: a witty, youthful and talkative partner who brings intellectual companionship; variety and conversation keep the bond fresh.',
        '7-ஆம் வீடு மிதுனம்: நகைச்சுவையும் இளமையும் பேச்சுத் திறனும் கொண்ட துணை; அறிவார்ந்த தோழமை; பல்வகைமையும் உரையாடலும் உறவைப் புதுமையாக வைக்கும்.'],
      ['Cancer on the 7th: a caring, emotional and family-oriented partner who nurtures the home; reassurance and kindness matter a lot.',
        '7-ஆம் வீடு கடகம்: அக்கறையும் உணர்வும் குடும்பப் பற்றும் கொண்ட துணை; இல்லத்தைப் பேணுபவர்; ஆறுதலும் அன்பும் மிக முக்கியம்.'],
      ['Leo on the 7th: a proud, dignified and generous partner with a strong personality; mutual respect is the key to harmony.',
        '7-ஆம் வீடு சிம்மம்: பெருமிதமும் கௌரவமும் தாராளமும் கொண்ட, வலுவான ஆளுமையுள்ள துணை; பரஸ்பர மரியாதையே இணக்கத்தின் திறவுகோல்.'],
      ['Virgo on the 7th: a practical, intelligent and helpful partner who notices details; appreciate their care and keep criticism gentle.',
        '7-ஆம் வீடு கன்னி: நடைமுறை அறிவும் புத்திசாலித்தனமும் உதவும் மனமும் கொண்ட துணை; அவர்களின் அக்கறையைப் பாராட்டுங்கள்; விமர்சனத்தில் மென்மை வேண்டும்.'],
      ['Libra on the 7th: a charming, balanced and artistic partner; a naturally harmonious placement that favours a sociable, graceful married life.',
        '7-ஆம் வீடு துலாம்: வசீகரமும் சமநிலையும் கலையுணர்வும் கொண்ட துணை; இயல்பாகவே இணக்கமான அமைப்பு — இனிய, சமூகப் பண்புள்ள இல்லறம்.'],
      ['Scorpio on the 7th: an intense, loyal and passionate partner and a deep bond; trust and openness prevent possessiveness.',
        '7-ஆம் வீடு விருச்சிகம்: தீவிரமும் விசுவாசமும் உணர்ச்சியும் கொண்ட துணை; ஆழமான பிணைப்பு; நம்பிக்கையும் வெளிப்படைத்தன்மையும் உரிமை உணர்வைக் கட்டுப்படுத்தும்.'],
      ['Sagittarius on the 7th: a principled, optimistic and often religious partner who loves freedom and learning; shared ideals hold you together.',
        '7-ஆம் வீடு தனுசு: கொள்கைப் பிடிப்பும் நம்பிக்கையும் பக்தியும் கொண்ட, சுதந்திரமும் கல்வியும் விரும்பும் துணை; பொதுவான லட்சியங்கள் உங்களை இணைக்கும்.'],
      ['Capricorn on the 7th: a responsible, mature and hardworking partner, possibly older or more serious; the marriage grows steadier with time.',
        '7-ஆம் வீடு மகரம்: பொறுப்பும் முதிர்ச்சியும் உழைப்பும் கொண்ட துணை, வயதில் அல்லது இயல்பில் மூத்தவராக இருக்கலாம்; காலப்போக்கில் திருமணம் மேலும் உறுதியாகும்.'],
      ['Aquarius on the 7th: a friendly, independent and unconventional partner; friendship and shared causes are the foundation of the marriage.',
        '7-ஆம் வீடு கும்பம்: நட்பும் சுதந்திரமும் வித்தியாசமான சிந்தனையும் கொண்ட துணை; நட்பும் பொது நோக்கங்களும் திருமணத்தின் அடித்தளம்.'],
      ['Pisces on the 7th: a gentle, compassionate and spiritual partner, romantic and sensitive; clear communication keeps the dream grounded.',
        '7-ஆம் வீடு மீனம்: மென்மையும் கருணையும் ஆன்மிகமும் கொண்ட, காதலும் உணர்வும் மிக்க துணை; தெளிவான உரையாடல் கனவை நடைமுறையாக்கும்.']
    ]),
    venus: {
      strong: { en: 'Venus, karaka of love and marriage, is strong: affection, attraction and marital comforts are well supported.', ta: 'காதல், திருமணக் காரகன் சுக்கிரன் பலமாக உள்ளார்: அன்பு, ஈர்ப்பு, இல்லற சுகங்களுக்கு நல்ல ஆதரவு.' },
      mid: { en: 'Venus is moderately placed: harmony grows through shared interests, small courtesies and time spent together.', ta: 'சுக்கிரன் மிதமான நிலையில்: பொதுவான ஆர்வங்கள், சிறு மரியாதைகள், சேர்ந்திருக்கும் நேரம் மூலம் இணக்கம் வளரும்.' },
      weak: { en: 'Venus is weak: expectations in love need to be realistic; patience, appreciation and Friday worship of Mahalakshmi help.', ta: 'சுக்கிரன் பலவீனம்: காதலில் எதிர்பார்ப்புகள் நடைமுறைக்கு ஏற்றதாக இருக்கட்டும்; பொறுமை, பாராட்டு, வெள்ளிக்கிழமை மகாலட்சுமி வழிபாடு உதவும்.' }
    },
    jupiter: {
      strong: { en: 'For a woman’s chart Jupiter also signifies the husband; it is strong, promising a supportive, principled spouse.', ta: 'பெண் ஜாதகத்தில் குரு கணவரையும் குறிப்பார்; குரு பலமாக இருப்பதால் ஆதரவான, நெறியுள்ள கணவர் அமைவார்.' },
      mid: { en: 'For a woman’s chart Jupiter also signifies the husband; it is moderately placed, so mutual respect and shared values matter.', ta: 'பெண் ஜாதகத்தில் குரு கணவரையும் குறிப்பார்; குரு மிதமான நிலையில் — பரஸ்பர மரியாதையும் பொதுவான மதிப்பீடுகளும் முக்கியம்.' },
      weak: { en: 'For a woman’s chart Jupiter also signifies the husband; it is weak, so take time in choosing and Thursday Guru worship helps.', ta: 'பெண் ஜாதகத்தில் குரு கணவரையும் குறிப்பார்; குரு பலவீனமாக இருப்பதால் தேர்வில் அவசரம் வேண்டாம்; வியாழக்கிழமை குரு வழிபாடு உதவும்.' }
    },
    jupiterAspect: { en: 'Jupiter’s presence or aspect on the 7th house is a strong protection for marriage.', ta: '7-ஆம் வீட்டில் குருவின் இருப்பு அல்லது பார்வை திருமணத்திற்கு வலுவான பாதுகாப்பு.' },
    malefics: { en: 'Malefic planets in the 7th ({x}) call for patience, personal space and careful horoscope matching.', ta: '7-ஆம் வீட்டில் பாப கிரகங்கள் ({x}) இருப்பதால் பொறுமை, தனிப்பட்ட இடம், கவனமான ஜாதகப் பொருத்தம் தேவை.' },
    chevvaiRef: { en: 'Chevvai dosham status: {x} — see the Yogas & Doshas tab for details.', ta: 'செவ்வாய் தோஷ நிலை: {x} — விவரங்களுக்கு யோகங்கள் & தோஷங்கள் பகுதியைப் பார்க்கவும்.' }
  };

  /* ================================================================ HEALTH */
  K.health = {
    constitution: gb([
      ['A fire-sign Lagna gives a pitta-leaning constitution: strong digestion and drive, but heat, acidity and inflammation build up — cooling food and rest balance it.',
        'நெருப்பு ராசி லக்னம் பித்த இயல்பைத் தரும்: நல்ல செரிமானமும் உந்துதலும்; ஆனால் உஷ்ணம், அமிலத்தன்மை, அழற்சி கூடலாம் — குளிர்ச்சியான உணவும் ஓய்வும் சமன் செய்யும்.'],
      ['An earth-sign Lagna gives a steady but slow-to-change constitution: good endurance, with sluggish digestion, joints or weight to watch — regular exercise keeps it light.',
        'நில ராசி லக்னம் நிலையான அமைப்பைத் தரும்: நல்ல சகிப்புத்தன்மை; மந்தமான செரிமானம், மூட்டுகள், எடை கவனிக்கவும் — முறையான உடற்பயிற்சி நல்லது.'],
      ['An air-sign Lagna gives a vata-leaning constitution: quick and lively, but prone to nervous strain, dryness, gas and poor sleep — routine and warm food ground it.',
        'காற்று ராசி லக்னம் வாத இயல்பைத் தரும்: சுறுசுறுப்பு; ஆனால் நரம்புச் சோர்வு, வறட்சி, வாயு, உறக்கக் குறைவு வரலாம் — ஒழுங்கான வழக்கமும் சூடான உணவும் நிலைப்படுத்தும்.'],
      ['A water-sign Lagna gives a kapha-leaning constitution: nurturing and resilient, but prone to colds, water retention and weight gain — light food and activity help.',
        'நீர் ராசி லக்னம் கப இயல்பைத் தரும்: மீண்டு எழும் ஆற்றல்; ஆனால் சளி, நீர்க்கோர்வை, எடை கூடுதல் வரலாம் — எளிய உணவும் சுறுசுறுப்பும் உதவும்.']
    ]),
    body: gb([
      ['head, brain and face', 'தலை, மூளை, முகம்'], ['face, throat, neck and thyroid', 'முகம், தொண்டை, கழுத்து, தைராய்டு'],
      ['shoulders, arms, lungs and nerves', 'தோள்கள், கைகள், நுரையீரல், நரம்புகள்'], ['chest, breasts and stomach', 'மார்பு, மார்பகம், இரைப்பை'],
      ['heart, spine and upper back', 'இதயம், முதுகுத்தண்டு, மேல் முதுகு'], ['intestines and digestion', 'குடல், செரிமானம்'],
      ['kidneys, lower back and skin', 'சிறுநீரகம், கீழ் முதுகு, சருமம்'], ['reproductive and excretory organs', 'இனப்பெருக்க, கழிவு உறுப்புகள்'],
      ['hips, thighs and liver', 'இடுப்பு, தொடைகள், கல்லீரல்'], ['knees, bones and joints', 'முழங்கால், எலும்புகள், மூட்டுகள்'],
      ['calves, ankles and circulation', 'கால் சதை, கணுக்கால், ரத்த ஓட்டம்'], ['feet, lymph and sleep', 'பாதங்கள், நிணநீர், உறக்கம்']
    ]),
    planet: {
      Sun: { en: 'heart, eyes, bones and vitality', ta: 'இதயம், கண்கள், எலும்புகள், உடல் வலிமை' },
      Moon: { en: 'mind, sleep, body fluids and chest', ta: 'மனம், உறக்கம், உடல் திரவங்கள், மார்பு' },
      Mars: { en: 'blood, inflammation, injuries and fevers', ta: 'ரத்தம், அழற்சி, காயங்கள், காய்ச்சல்' },
      Mercury: { en: 'nerves, skin, speech and allergies', ta: 'நரம்புகள், சருமம், பேச்சு, ஒவ்வாமை' },
      Jupiter: { en: 'liver, fat metabolism, blood sugar and weight', ta: 'கல்லீரல், கொழுப்பு, சர்க்கரை, எடை' },
      Venus: { en: 'kidneys, hormones and reproductive health', ta: 'சிறுநீரகம், ஹார்மோன்கள், இனப்பெருக்க நலம்' },
      Saturn: { en: 'joints, teeth, chronic fatigue and long-standing conditions', ta: 'மூட்டுகள், பற்கள், நீடித்த சோர்வு, நாட்பட்ட பிரச்சினைகள்' },
      Rahu: { en: 'allergies, toxins and hard-to-diagnose complaints', ta: 'ஒவ்வாமை, நச்சுகள், கண்டறிய கடினமான பிரச்சினைகள்' },
      Ketu: { en: 'sudden infections, viral fevers and minor surgeries', ta: 'திடீர்த் தொற்றுகள், வைரஸ் காய்ச்சல், சிறு அறுவை சிகிச்சைகள்' }
    },
    lagnaLord: {
      strong: { en: 'Your Lagna lord {p} is strong, a good sign for vitality, resistance and recovery.', ta: 'உங்கள் லக்னாதிபதி {p} பலமாக உள்ளார் — உடல் வலிமை, எதிர்ப்பு சக்தி, விரைவான குணமடைதலுக்கு நல்ல அடையாளம்.' },
      mid: { en: 'Your Lagna lord {p} is moderately placed: health stays good with sensible habits and regular rest.', ta: 'உங்கள் லக்னாதிபதி {p} மிதமான நிலையில்: நல்ல பழக்கங்களும் முறையான ஓய்வும் இருந்தால் உடல்நலம் நன்றாக இருக்கும்.' },
      weak: { en: 'Your Lagna lord {p} is weak, so energy needs protecting: steady sleep, balanced food and early attention to small complaints.', ta: 'உங்கள் லக்னாதிபதி {p} பலவீனம்; சக்தியைக் காக்க வேண்டும்: நிலையான உறக்கம், சமச்சீர் உணவு, சிறு பிரச்சினைகளையும் உடனே கவனித்தல்.' }
    },
    sixth: { en: 'The 6th house (illness and resistance) falls in {s}: give extra care to the {x}.', ta: 'நோய் எதிர்ப்பு ஸ்தானமான 6-ஆம் வீடு {sl} உள்ளது: {x} — இவற்றில் கூடுதல் கவனம் தேவை.' },
    eighth: { en: 'The 8th house (chronic and hidden matters) falls in {s}: the {x} benefit from regular check-ups.', ta: 'நாட்பட்ட, மறைவான விஷயங்களின் ஸ்தானமான 8-ஆம் வீடு {sl} உள்ளது: {x} — முறையான பரிசோதனைகள் நல்லது.' },
    planetsIn: { en: 'Planets in the {h} house point to the {x}.', ta: '{h}-ஆம் வீட்டில் உள்ள கிரகங்கள் குறிக்கும் பகுதிகள்: {x}.' },
    moonStrong: { en: 'A strong Moon supports a calm mind and good sleep.', ta: 'பலமான சந்திரன் அமைதியான மனத்தையும் நல்ல உறக்கத்தையும் தருவார்.' },
    moonWeak: { en: 'The Moon needs support, so protect your mental rest: regular sleep, time in nature and calming practices such as pranayama.', ta: 'சந்திரனுக்கு ஆதரவு தேவை — மன ஓய்வைக் காக்கவும்: ஒழுங்கான உறக்கம், இயற்கையில் நேரம், பிராணாயாமம் போன்ற அமைதிப் பயிற்சிகள்.' },
    advice: { en: 'These are traditional indicators only — for any symptom, please consult a doctor.', ta: 'இவை பாரம்பரியக் குறிப்புகள் மட்டுமே — எந்த அறிகுறிக்கும் மருத்துவரை அணுகவும்.' }
  };

  /* ================================================================ YOGAS & DOSHAS */
  K.yogaUi = {
    found: { en: 'Found in your chart', ta: 'உங்கள் ஜாதகத்தில் உள்ளவை' },
    checked: { en: 'Also checked — not formed', ta: 'சரிபார்க்கப்பட்டவை — அமையவில்லை' },
    rule: { en: 'Rule', ta: 'விதி' },
    present: { en: 'Present', ta: 'உள்ளது' }, absent: { en: 'Not formed', ta: 'அமையவில்லை' },
    yoga: { en: 'Yoga', ta: 'யோகம்' }, dosha: { en: 'Dosha', ta: 'தோஷம்' },
    from: { en: 'Counted from', ta: 'கணக்கிட்ட இடம்' }, marsHouse: { en: 'Mars in house', ta: 'செவ்வாய் இருக்கும் வீடு' },
    doshaHouse: { en: 'dosha house', ta: 'தோஷ வீடு' }
  };
  K.yogas = {
    chevvai: {
      name: { en: 'Chevvai Dosham (Manglik)', ta: 'செவ்வாய் தோஷம்' },
      rule: { en: 'Mars in the 1st, 2nd, 4th, 7th, 8th or 12th house counted from the Lagna, the Moon or Venus.', ta: 'லக்னம், சந்திரன் அல்லது சுக்கிரனில் இருந்து 1, 2, 4, 7, 8, 12-ஆம் வீடுகளில் செவ்வாய் இருப்பது.' },
      present: { en: 'Mars occupies a dosha house (counted from {x}) and no standard exception applies, so Chevvai dosham is present. It mainly calls for careful matching: a partner with a similar dosha balances it (dosha saamyam).', ta: 'செவ்வாய் தோஷ வீட்டில் உள்ளார் (கணக்கிட்ட இடம்: {x}); விதிவிலக்கு எதுவும் பொருந்தாததால் செவ்வாய் தோஷம் உள்ளது. இது முக்கியமாக கவனமான பொருத்தத்தைக் கோருகிறது — இதே தோஷம் உள்ள துணையுடன் இணைவது சமன் செய்யும் (தோஷ சாம்யம்).' },
      mild: { en: 'Mars forms the dosha only when counted from {x}, not from the Lagna, which most South Indian astrologers treat as mild.', ta: 'லக்னத்திலிருந்து செவ்வாய் தோஷம் இல்லை; {x} அடிப்படையில் மட்டும் உள்ளது — தென்னிந்திய ஜோதிடர்கள் பெரும்பாலும் இதை லேசான தோஷமாகக் கருதுவர்.' },
      cancelled: { en: 'Mars is in a dosha house (counted from {x}), but the dosha is cancelled (dosha bhangam) because {y}.', ta: 'செவ்வாய் தோஷ வீட்டில் உள்ளார் (கணக்கிட்ட இடம்: {x}); ஆனால் {y} என்பதால் தோஷம் நிவர்த்தியாகிறது (தோஷ பங்கம்).' },
      absent: { en: 'Mars is not in a dosha house from the Lagna, the Moon or Venus — there is no Chevvai dosham.', ta: 'லக்னம், சந்திரன், சுக்கிரன் — எதிலிருந்தும் செவ்வாய் தோஷ வீட்டில் இல்லை; செவ்வாய் தோஷம் இல்லை.' },
      exc: {
        own: { en: 'Mars is in its own sign or exalted', ta: 'செவ்வாய் ஆட்சி அல்லது உச்சம் பெற்றுள்ளார்' },
        lagna: { en: 'for Kadagam and Simmam Lagnas Mars is the yogakaraka', ta: 'கடக, சிம்ம லக்னங்களுக்கு செவ்வாய் யோககாரகன்' },
        jupiter: { en: 'Jupiter joins or aspects Mars', ta: 'குரு செவ்வாயுடன் சேர்ந்துள்ளார் அல்லது பார்க்கிறார்' },
        sign: { en: 'Mars in the {h} house in {s} is a classical exception', ta: '{h}-ஆம் வீட்டில் {sl} செவ்வாய் இருப்பது பாரம்பரிய விதிவிலக்கு' }
      },
      age: { en: 'Tradition also holds that its effect softens after about age 28.', ta: '28 வயதுக்குப் பின் இதன் தாக்கம் குறையும் என்பதும் மரபு.' },
      remedy: { en: 'Remedies: worship Lord Murugan on Tuesdays (Skanda Sashti Kavacham), visit Vaitheeswaran Koil (the Angaraka sthalam) and donate red lentils (thuvaram paruppu).', ta: 'பரிகாரம்: செவ்வாய்க்கிழமைகளில் முருகன் வழிபாடு (கந்த சஷ்டி கவசம்), வைத்தீஸ்வரன் கோயில் (அங்காரக ஸ்தலம்) தரிசனம், துவரம் பருப்பு தானம்.' },
      ref: { Lagna: { en: 'Lagna', ta: 'லக்னம்' }, Moon: { en: 'Moon', ta: 'சந்திரன்' }, Venus: { en: 'Venus', ta: 'சுக்கிரன்' } },
      status: { present: { en: 'Present', ta: 'உள்ளது' }, mild: { en: 'Mild', ta: 'லேசானது' }, cancelled: { en: 'Cancelled', ta: 'நிவர்த்தி' }, absent: { en: 'Not present', ta: 'இல்லை' } }
    },
    kalasarpa: {
      name: { en: 'Kala Sarpa Dosham', ta: 'கால சர்ப்ப தோஷம்' },
      rule: { en: 'All seven planets from the Sun to Saturn lie on one side of the Rahu–Ketu axis.', ta: 'சூரியன் முதல் சனி வரையிலான ஏழு கிரகங்களும் ராகு–கேது அச்சின் ஒரு பக்கத்திலேயே இருப்பது.' },
      present: { en: 'All seven planets are hemmed between Rahu and Ketu: {x} Kala Sarpa ({y}). Tradition says it brings struggle and delay early in life, followed by a strong, often sudden rise with maturity; Rahu and Ketu periods are intensified.', ta: 'ஏழு கிரகங்களும் ராகு–கேதுவுக்கு இடையில் அடைபட்டுள்ளன: {x} கால சர்ப்பம் ({y}). வாழ்வின் முற்பகுதியில் போராட்டமும் தாமதமும், முதிர்ச்சிக்குப் பின் வலுவான திடீர் உயர்வும் தரும் என்பது மரபு; ராகு, கேது தசைகளில் தீவிரம் கூடும்.' },
      partial: { en: 'Six planets are hemmed and {p} lies just outside the axis by degree, so this is a partial (ardha) Kala Sarpa, milder in effect.', ta: 'ஆறு கிரகங்கள் அடைபட்டுள்ளன; {p} பாகை அடிப்படையில் அச்சுக்குச் சற்று வெளியே உள்ளார் — இது பகுதி (அர்த்த) கால சர்ப்பம், லேசானது.' },
      absent: { en: 'Planets lie on both sides of the Rahu–Ketu axis — there is no Kala Sarpa dosham.', ta: 'ராகு–கேது அச்சின் இரு பக்கங்களிலும் கிரகங்கள் உள்ளன — கால சர்ப்ப தோஷம் இல்லை.' },
      savya: { en: 'savya — from Rahu towards Ketu', ta: 'சவ்ய — ராகுவிலிருந்து கேது நோக்கி' },
      apasavya: { en: 'apasavya, also called Kala Amirtha — from Ketu towards Rahu', ta: 'அபசவ்ய (கால அமிர்தம்) — கேதுவிலிருந்து ராகு நோக்கி' },
      types: gb([['Ananta', 'அனந்த'], ['Kulika', 'குளிகை'], ['Vasuki', 'வாசுகி'], ['Shankhapala', 'சங்கபால'], ['Padma', 'பத்ம'], ['Mahapadma', 'மகாபத்ம'],
        ['Takshaka', 'தட்சக'], ['Karkotaka', 'கார்க்கோடக'], ['Shankhachuda', 'சங்கசூட'], ['Ghataka', 'காதக'], ['Vishdhara', 'விஷ்தார'], ['Sheshanaga', 'சேஷநாக']]),
      remedy: { en: 'Remedies: Rahu–Ketu puja at Thirunageswaram or Sri Kalahasti, Naga worship on Panchami days, and Durga stotras.', ta: 'பரிகாரம்: திருநாகேஸ்வரம் அல்லது ஸ்ரீ காளஹஸ்தியில் ராகு–கேது பூஜை, பஞ்சமி நாட்களில் நாக வழிபாடு, துர்கை ஸ்தோத்திரம்.' },
      status: { present: { en: 'Present', ta: 'உள்ளது' }, partial: { en: 'Partial', ta: 'பகுதி' }, absent: { en: 'Not present', ta: 'இல்லை' } }
    },
    mahapurusha: {
      rule: { en: '{p} in a kendra (1st, 4th, 7th or 10th) in its own or exalted sign.', ta: '{p} கேந்திரத்தில் (1, 4, 7, 10) ஆட்சி அல்லது உச்சம் பெற்றிருப்பது.' },
      Mars: { name: { en: 'Ruchaka Yoga', ta: 'ருசக யோகம்' }, en: 'Courage, physical strength and leadership, with success in land, defence, sport or engineering; a commanding, fearless personality.', ta: 'தைரியம், உடல் வலிமை, தலைமை; நிலம், பாதுகாப்புத் துறை, விளையாட்டு, பொறியியலில் வெற்றி; அச்சமற்ற கம்பீர ஆளுமை.' },
      Mercury: { name: { en: 'Bhadra Yoga', ta: 'பத்ர யோகம்' }, en: 'A brilliant intellect, eloquence, business skill and learning, with long life and respect among scholars.', ta: 'சிறந்த அறிவு, சொல்வன்மை, வணிகத் திறன், கல்வி; நீண்ட ஆயுள், அறிஞர்களிடையே மதிப்பு.' },
      Jupiter: { name: { en: 'Hamsa Yoga', ta: 'ஹம்ச யோகம்' }, en: 'Righteousness, wisdom, a good name and spiritual merit; often a teacher, judge or adviser whom others trust.', ta: 'நேர்மை, ஞானம், நற்பெயர், ஆன்மிகப் புண்ணியம்; பிறர் நம்பும் ஆசிரியர், நீதிபதி அல்லது ஆலோசகர்.' },
      Venus: { name: { en: 'Malavya Yoga', ta: 'மாளவ்ய யோகம்' }, en: 'Beauty, refinement, comforts, vehicles and a happy married life, with success in the arts and luxury.', ta: 'அழகு, நளினம், சுகங்கள், வாகனங்கள், மகிழ்ச்சியான இல்லறம்; கலை, ஆடம்பரத் துறையில் வெற்றி.' },
      Saturn: { name: { en: 'Sasa Yoga', ta: 'சச யோகம்' }, en: 'Authority over people, organising power and a steady rise through discipline; leadership in administration, industry or politics.', ta: 'மக்கள் மீது அதிகாரம், ஒருங்கிணைக்கும் ஆற்றல், ஒழுக்கத்தால் நிலையான உயர்வு; நிர்வாகம், தொழில், அரசியலில் தலைமை.' },
      fromMoon: { en: 'It forms from the Moon (Chandra lagna) rather than the Lagna, so it works more through the mind and in later life.', ta: 'லக்னத்திலிருந்து அல்லாமல் சந்திர லக்னத்திலிருந்து அமைவதால், மனதின் வழியாகவும் வாழ்வின் பிற்பகுதியிலும் பலன் தரும்.' },
      combust: { en: 'Its strength is reduced because {p} is combust.', ta: '{p} அஸ்தங்கம் பெற்றதால் இதன் பலம் குறைகிறது.' }
    },
    gajakesari: {
      name: { en: 'Gajakesari Yoga', ta: 'கஜகேசரி யோகம்' },
      rule: { en: 'Jupiter in a kendra (1st, 4th, 7th or 10th) from the Moon.', ta: 'சந்திரனில் இருந்து குரு கேந்திரத்தில் (1, 4, 7, 10) இருப்பது.' },
      en: 'Like the elephant and the lion together: intelligence, a good reputation, lasting prosperity and the power to overcome obstacles. Jupiter is in the {x} house from the Moon.',
      ta: 'யானையும் சிங்கமும் இணைந்தது போல்: அறிவு, நற்பெயர், நிலையான வளம், தடைகளை வெல்லும் ஆற்றல். சந்திரனிலிருந்து குரு {x}-ஆம் வீட்டில் உள்ளார்.',
      weak: { en: 'Jupiter or the Moon is weak here, so the yoga gives its results more modestly.', ta: 'குரு அல்லது சந்திரன் பலவீனமாக இருப்பதால் இந்த யோகம் மிதமான பலனே தரும்.' }
    },
    budhaditya: {
      name: { en: 'Budhaditya Yoga', ta: 'புதாதித்ய யோகம்' },
      rule: { en: 'The Sun and Mercury together in one sign.', ta: 'சூரியனும் புதனும் ஒரே ராசியில் இணைந்திருப்பது.' },
      en: 'Sharp intelligence, communication skill, good education and recognition for your knowledge. Formed in the {h} house, it highlights {x}.',
      ta: 'கூர்மையான அறிவு, தொடர்புத் திறன், நல்ல கல்வி, அறிவுக்கு அங்கீகாரம். {h}-ஆம் வீட்டில் அமைவதால் {x} சிறப்படையும்.',
      combust: { en: 'Mercury is combust, so the yoga works through hard study rather than effortless brilliance.', ta: 'புதன் அஸ்தங்கம் — எனவே இந்த யோகம் எளிதான மேதைமையாக அல்லாமல் கடின உழைப்பின் மூலம் பலன் தரும்.' }
    },
    chandraMangala: {
      name: { en: 'Chandra-Mangala Yoga', ta: 'சந்திர மங்கள யோகம்' },
      rule: { en: 'The Moon and Mars together, or 7th from each other.', ta: 'சந்திரனும் செவ்வாயும் இணைந்திருப்பது அல்லது ஒருவருக்கொருவர் 7-இல் இருப்பது.' },
      en: 'A drive to earn, business sense and the courage to act on feelings; wealth through enterprise, land or trade. Keep emotions and temper balanced.',
      ta: 'சம்பாதிக்கும் உந்துதல், வணிக அறிவு, உணர்வைச் செயலாக்கும் தைரியம்; தொழில், நிலம், வணிகம் மூலம் செல்வம். உணர்ச்சியிலும் கோபத்திலும் சமநிலை தேவை.'
    },
    kemadruma: {
      name: { en: 'Kemadruma Yoga', ta: 'கேமத்ரும யோகம்' },
      rule: { en: 'No planet other than the Sun, Rahu and Ketu in the 2nd or 12th from the Moon.', ta: 'சந்திரனுக்கு 2, 12-ஆம் வீடுகளில் (சூரியன், ராகு, கேது தவிர) கிரகம் இல்லாதிருப்பது.' },
      present: { en: 'The Moon stands alone, which can bring spells of loneliness or financial ups and downs; inner strength, routine and supportive friendships counter it.', ta: 'சந்திரன் தனித்து நிற்கிறார்; சில காலம் தனிமை உணர்வு அல்லது பண ஏற்றத் தாழ்வு வரலாம்; உள்வலிமை, ஒழுங்கு, ஆதரவான நட்புகள் இதைச் சமன் செய்யும்.' },
      cancelled: { en: 'The Moon has no neighbours in the 2nd or 12th, but the yoga is cancelled because {x}.', ta: 'சந்திரனுக்கு 2, 12-இல் கிரகம் இல்லை; ஆனால் {x} என்பதால் இந்த யோகம் நிவர்த்தியாகிறது.' },
      cancelKendra: { en: 'a planet occupies a kendra from the Moon or the Lagna', ta: 'சந்திரன் அல்லது லக்னத்திலிருந்து கேந்திரத்தில் கிரகம் உள்ளது' },
      cancelConj: { en: 'a planet joins the Moon', ta: 'சந்திரனுடன் கிரகம் இணைந்துள்ளது' },
      remedy: { en: 'Remedy: Monday worship of Ambal (Goddess Parvati) and gifts of milk or rice to those in need.', ta: 'பரிகாரம்: திங்கள்கிழமை அம்பாள் வழிபாடு; தேவைப்படுவோருக்கு பால் அல்லது அரிசி தானம்.' },
      status: { present: { en: 'Present', ta: 'உள்ளது' }, cancelled: { en: 'Cancelled', ta: 'நிவர்த்தி' } }
    },
    neechaBhanga: {
      name: { en: 'Neecha Bhanga Raja Yoga', ta: 'நீச பங்க ராஜ யோகம்' },
      rule: { en: 'A debilitated planet whose weakness is cancelled — for example when the lord of its sign or of its exaltation sign stands in a kendra.', ta: 'நீசம் பெற்ற கிரகத்தின் நீசம் நிவர்த்தியாவது — உதாரணமாக அது இருக்கும் ராசி அதிபதி அல்லது அதன் உச்ச ராசி அதிபதி கேந்திரத்தில் இருப்பது.' },
      en: '{p} is debilitated, but the weakness is cancelled because {x}. The classical result is an early struggle that turns into strong, often surprising success.',
      ta: '{p} நீசம் பெற்றிருந்தாலும் {x} என்பதால் நீசம் பங்கமாகிறது. பாரம்பரியப் பலன்: தொடக்கத்தில் போராட்டம், பின்னர் வலுவான, எதிர்பாராத வெற்றி.',
      reasonSignLord: { en: 'its sign lord {q} is in a kendra', ta: 'அது இருக்கும் ராசியின் அதிபதி {q} கேந்திரத்தில் உள்ளார்' },
      reasonExLord: { en: 'the lord of its exaltation sign, {q}, is in a kendra', ta: 'அதன் உச்ச ராசி அதிபதி {q} கேந்திரத்தில் உள்ளார்' },
      reasonNav: { en: 'it is exalted or in its own sign in the Navamsam', ta: 'நவாம்சத்தில் உச்சம் அல்லது ஆட்சி பெற்றுள்ளார்' },
      plain: { en: '{p} is debilitated without cancellation; strengthen it with its remedy: {x}', ta: '{p} நீசம் — நிவர்த்தி இல்லை; பரிகாரம் மூலம் பலப்படுத்தவும்: {x}' },
      plainName: { en: 'Neecham (debilitation)', ta: 'நீசம்' }
    },
    dharmaKarma: {
      name: { en: 'Dharma-Karmadhipati Yoga', ta: 'தர்ம கர்மாதிபதி யோகம்' },
      rule: { en: 'The lords of the 9th (dharma) and 10th (karma) houses joined, exchanged or aspecting each other.', ta: '9-ஆம் (தர்ம), 10-ஆம் (கர்ம) அதிபதிகள் இணைதல், பரிவர்த்தனை அல்லது பரஸ்பர பார்வை.' },
      en: 'A powerful Raja yoga for career: {x}. Fortune and action support each other, bringing status and purposeful work.',
      ta: 'தொழிலுக்கு வலுவான ராஜ யோகம்: {x}. பாக்கியமும் கர்மமும் ஒன்றுக்கொன்று துணையாகி அந்தஸ்தும் அர்த்தமுள்ள பணியும் தரும்.',
      same: { en: '{p} rules both the 9th and the 10th (yogakaraka) and is well placed', ta: '{p} 9, 10 ஆகிய இரு வீடுகளுக்கும் அதிபதியாகி (யோககாரகன்) நல்ல நிலையில் உள்ளார்' },
      conj: { en: '{p} and {q} are together in {s}', ta: '{p}-உம் {q}-உம் {sl} இணைந்துள்ளனர்' },
      exchange: { en: '{p} and {q} have exchanged signs', ta: '{p}-உம் {q}-உம் பரிவர்த்தனை பெற்றுள்ளனர்' },
      aspect: { en: '{p} and {q} aspect each other', ta: '{p}-உம் {q}-உம் ஒருவரையொருவர் பார்க்கின்றனர்' }
    }
  };

  /* ================================================================ DASHA-BHUKTI */
  K.dasha = {
    md: {
      Sun: { en: 'The Sun Maha Dasha (6 years) brings authority, visibility and the father’s influence to the fore: career recognition, government matters and self-confidence grow, while ego, heart and eyes need care.', ta: 'சூரிய தசை (6 ஆண்டுகள்): அதிகாரம், புகழ், தந்தையின் பங்கு முன்னிலை பெறும்; தொழில் அங்கீகாரம், அரசு விஷயங்கள், தன்னம்பிக்கை வளரும்; அகந்தை, இதயம், கண் நலம் கவனிக்கவும்.' },
      Moon: { en: 'The Moon Maha Dasha (10 years) turns attention to the mind, mother, home and public life: travel, changes of residence, popularity and emotional growth, with rising comforts when the Moon is strong.', ta: 'சந்திர தசை (10 ஆண்டுகள்): மனம், தாய், வீடு, பொது வாழ்க்கை மீது கவனம்; பயணம், இட மாற்றம், மக்கள் அபிமானம், மன வளர்ச்சி; சந்திரன் பலமாக இருந்தால் சுகங்கள் பெருகும்.' },
      Mars: { en: 'The Mars Maha Dasha (7 years) is a time of energy and action: property, land, siblings, competition and technical work come forward; courage wins, while haste, accidents and quarrels must be avoided.', ta: 'செவ்வாய் தசை (7 ஆண்டுகள்): ஆற்றலும் செயலும் நிறைந்த காலம்; சொத்து, நிலம், சகோதரர், போட்டி, தொழில்நுட்பப் பணிகள் முன்னிலை; தைரியம் வெல்லும் — அவசரம், விபத்து, சண்டைகளைத் தவிர்க்கவும்.' },
      Rahu: { en: 'The Rahu Maha Dasha (18 years) amplifies ambition: foreign links, technology, unconventional paths and sudden rises are typical, with phases of confusion; clear goals and ethical choices make it rewarding.', ta: 'ராகு தசை (18 ஆண்டுகள்): லட்சியத்தைப் பெரிதாக்கும்; வெளிநாட்டுத் தொடர்பு, தொழில்நுட்பம், வழக்கத்திற்கு மாறான பாதைகள், திடீர் உயர்வுகள் வழக்கம்; இடையே குழப்ப காலங்களும் வரும் — தெளிவான இலக்கும் நேர்மையான தேர்வுகளும் பலன் தரும்.' },
      Jupiter: { en: 'The Jupiter Maha Dasha (16 years) is usually a time of expansion and grace: learning, children, marriage, wealth, teachers and dharma; good counsel arrives and ethical effort is rewarded.', ta: 'குரு தசை (16 ஆண்டுகள்): பொதுவாக வளர்ச்சியும் அருளும் நிறைந்த காலம்; கல்வி, குழந்தைகள், திருமணம், செல்வம், குரு, தர்மம்; நல்ல ஆலோசனை கிடைக்கும், நேர்மையான முயற்சிக்குப் பலன்.' },
      Saturn: { en: 'The Saturn Maha Dasha (19 years) builds through discipline: responsibility, hard work, service and a steady, earned rise; delays teach patience, and what you build now lasts.', ta: 'சனி தசை (19 ஆண்டுகள்): ஒழுக்கத்தால் கட்டியெழுப்பும் காலம்; பொறுப்பு, கடின உழைப்பு, சேவை, உழைப்பால் பெறும் நிலையான உயர்வு; தாமதங்கள் பொறுமையைக் கற்பிக்கும் — இப்போது கட்டுவது நிலைக்கும்.' },
      Mercury: { en: 'The Mercury Maha Dasha (17 years) favours learning, business, communication and friendship: education, trade, writing and networks grow, and quick thinking opens doors.', ta: 'புதன் தசை (17 ஆண்டுகள்): கல்வி, வணிகம், தொடர்பு, நட்புக்குச் சாதகம்; படிப்பு, வர்த்தகம், எழுத்து, தொடர்புகள் வளரும்; விரைவான சிந்தனை வாய்ப்புகளைத் திறக்கும்.' },
      Ketu: { en: 'The Ketu Maha Dasha (7 years) brings detachment and inner work: spirituality, research, sudden changes and endings that clear the way for a new chapter; avoid rash decisions.', ta: 'கேது தசை (7 ஆண்டுகள்): பற்றின்மையும் உள்நோக்கமும்; ஆன்மிகம், ஆராய்ச்சி, திடீர் மாற்றங்கள், புதிய அத்தியாயத்திற்கு வழிவிடும் முடிவுகள்; அவசர முடிவுகளைத் தவிர்க்கவும்.' },
      Venus: { en: 'The Venus Maha Dasha (20 years) brings comforts and relationships: marriage, arts, vehicles, home, beauty and wealth through partnership; enjoy them with moderation.', ta: 'சுக்கிர தசை (20 ஆண்டுகள்): சுகங்களும் உறவுகளும்; திருமணம், கலை, வாகனம், வீடு, அழகு, கூட்டுறவால் செல்வம்; அளவோடு அனுபவியுங்கள்.' }
    },
    bd: {
      Sun: { en: 'The Sun bhukti highlights recognition, people in authority, government work and the health of the heart and eyes.', ta: 'சூரிய புத்தி: அங்கீகாரம், அதிகாரிகள், அரசுப் பணி, இதய, கண் நலம் முன்னிலை.' },
      Moon: { en: 'The Moon bhukti brings emotions, family, mother, travel and public dealings to the fore.', ta: 'சந்திர புத்தி: உணர்வுகள், குடும்பம், தாய், பயணம், பொதுமக்கள் தொடர்பு முன்னிலை.' },
      Mars: { en: 'The Mars bhukti adds energy and urgency: property, siblings, competition and technical tasks; avoid conflict and haste.', ta: 'செவ்வாய் புத்தி: ஆற்றலும் வேகமும் சேரும்; சொத்து, சகோதரர், போட்டி, தொழில்நுட்பப் பணிகள்; சண்டை, அவசரம் தவிர்க்கவும்.' },
      Mercury: { en: 'The Mercury bhukti favours study, trade, documents, communication and friends.', ta: 'புதன் புத்தி: படிப்பு, வணிகம், ஆவணங்கள், தொடர்பு, நண்பர்களுக்குச் சாதகம்.' },
      Jupiter: { en: 'The Jupiter bhukti brings guidance, expansion, auspicious events, children and financial growth.', ta: 'குரு புத்தி: வழிகாட்டல், வளர்ச்சி, சுப நிகழ்வுகள், குழந்தைகள், பண வளர்ச்சி.' },
      Venus: { en: 'The Venus bhukti brings comforts, relationships, marriage prospects, the arts and new purchases.', ta: 'சுக்கிர புத்தி: சுகங்கள், உறவுகள், திருமண வாய்ப்பு, கலை, புதிய பொருட்கள்.' },
      Saturn: { en: 'The Saturn bhukti asks for hard work and patience; responsibilities grow and results come slowly but solidly.', ta: 'சனி புத்தி: கடின உழைப்பும் பொறுமையும் தேவை; பொறுப்புகள் கூடும்; பலன் மெதுவாக ஆனால் உறுதியாக.' },
      Rahu: { en: 'The Rahu bhukti brings ambition, foreign or unusual opportunities and some confusion; verify before you trust.', ta: 'ராகு புத்தி: லட்சியம், வெளிநாட்டு அல்லது வித்தியாசமான வாய்ப்புகள், சில குழப்பங்கள்; நம்பும் முன் சரிபார்க்கவும்.' },
      Ketu: { en: 'The Ketu bhukti brings detachment, spiritual interest and sudden changes; keep plans simple and health in check.', ta: 'கேது புத்தி: பற்றின்மை, ஆன்மிக ஆர்வம், திடீர் மாற்றங்கள்; திட்டங்களை எளிமையாக வைத்து உடல்நலம் கவனிக்கவும்.' }
    },
    role: {
      yogakaraka: { en: 'For {s} Lagna, {p} is the yogakaraka (lord of houses {x}), so this period can raise status, property and recognition — use it to build lasting foundations.', ta: '{sa} லக்னத்திற்கு {p} யோககாரகன் ({x} வீடுகளின் அதிபதி); எனவே இக்காலம் அந்தஸ்து, சொத்து, அங்கீகாரத்தை உயர்த்தும் — நிலையான அடித்தளங்களை அமைக்கப் பயன்படுத்துங்கள்.' },
      benefic: { en: 'For {s} Lagna, {p} is a functional benefic (lord of houses {x}); its period generally supports growth in those areas.', ta: '{sa} லக்னத்திற்கு {p} சுபர் ({x} வீடுகளின் அதிபதி); இக்காலம் அவ்விஷயங்களில் பொதுவாக வளர்ச்சி தரும்.' },
      neutral: { en: 'For {s} Lagna, {p} is neutral (lord of houses {x}); its results depend mainly on the house it occupies and the planets it joins.', ta: '{sa} லக்னத்திற்கு {p} சமர் ({x} வீடுகளின் அதிபதி); பலன் பெரும்பாலும் அவர் இருக்கும் வீட்டையும் சேரும் கிரகங்களையும் பொறுத்தது.' },
      malefic: { en: 'For {s} Lagna, {p} is a functional malefic (lord of houses {x}); its period asks for caution and discipline in those areas, and remedies soften it.', ta: '{sa} லக்னத்திற்கு {p} பாபர் ({x} வீடுகளின் அதிபதி); இக்காலம் அவ்விஷயங்களில் எச்சரிக்கையும் ஒழுக்கமும் கோரும்; பரிகாரம் தணிக்கும்.' },
      node: { en: '{p} owns no houses; it acts for its sign lord {x} and for the {h} house it occupies.', ta: '{p}-க்கு சொந்த வீடு இல்லை; அது இருக்கும் ராசியின் அதிபதி {x}-இன் சார்பிலும், இருக்கும் {h}-ஆம் வீட்டின் சார்பிலும் செயல்படும்.' },
      maraka: { en: 'It is also a maraka (lord of the 2nd or 7th), so give extra attention to health and avoid unnecessary risks — maraka periods mark transitions and are nothing to fear.', ta: 'இவர் மாரகரும் கூட (2 அல்லது 7-ஆம் அதிபதி); உடல்நலத்தில் கூடுதல் கவனமும் தேவையற்ற ஆபத்துகளைத் தவிர்த்தலும் நல்லது — மாரக காலம் மாற்றங்களைக் குறிக்கும், அச்சப்பட வேண்டியதல்ல.' },
      placed: { en: 'It sits in the {h} house ({x}), so these matters come alive during the period.', ta: 'இவர் {h}-ஆம் வீட்டில் ({x}) இருப்பதால், இக்காலத்தில் இவ்விஷயங்கள் முன்னிலை பெறும்.' }
    },
    relation: {
      trine: { en: 'The bhukti lord is in a trine (1/5/9) from the dasha lord, so the two cooperate and results flow smoothly.', ta: 'புத்தி நாதன் தசா நாதனுக்குத் திரிகோணத்தில் (1/5/9) உள்ளார்; இருவரும் ஒத்துழைப்பர், பலன்கள் எளிதாக வரும்.' },
      kendra: { en: 'The bhukti lord is in a kendra (4/7/10) from the dasha lord: an active, eventful sub-period that rewards initiative.', ta: 'புத்தி நாதன் தசா நாதனுக்குக் கேந்திரத்தில் (4/7/10) உள்ளார்: முன்முயற்சிக்குப் பலன் தரும் சுறுசுறுப்பான காலம்.' },
      growth: { en: 'The bhukti lord is 3/11 from the dasha lord: growth through effort, networking and gains.', ta: 'புத்தி நாதன் தசா நாதனுக்கு 3/11-இல் உள்ளார்: முயற்சி, தொடர்புகள், லாபம் மூலம் வளர்ச்சி.' },
      mixed: { en: 'The bhukti lord is 2/12 from the dasha lord: gains and expenses run side by side, so budget carefully.', ta: 'புத்தி நாதன் தசா நாதனுக்கு 2/12-இல் உள்ளார்: வரவும் செலவும் இணைந்து வரும் — கவனமாகத் திட்டமிடுங்கள்.' },
      friction: { en: 'The bhukti lord is 6/8 from the dasha lord (shashtashtaka): expect friction and extra effort, protect your health and avoid disputes.', ta: 'புத்தி நாதன் தசா நாதனுக்கு 6/8-இல் உள்ளார் (சஷ்டாஷ்டகம்): உரசலும் கூடுதல் முயற்சியும் தேவை; உடல்நலம் காத்து வழக்குகளைத் தவிர்க்கவும்.' },
      same: { en: 'This is the dasha lord’s own bhukti, so its themes are at their purest.', ta: 'இது தசா நாதனின் சொந்த புத்தி; அவரது பலன்கள் முழுமையாக வெளிப்படும்.' },
      friends: { en: '{p} and {q} are natural friends, which helps.', ta: '{p}-உம் {q}-உம் இயற்கை நண்பர்கள் — இது உதவும்.' },
      enemies: { en: '{p} and {q} are natural enemies, so balance their agendas consciously.', ta: '{p}-உம் {q}-உம் இயற்கைப் பகைவர்கள் — அவர்களின் போக்குகளை விழிப்புடன் சமன் செய்யுங்கள்.' }
    },
    overall: {
      good: { title: { en: 'A favourable period', ta: 'சாதகமான காலம்' }, en: 'Both period lords support your chart. It is a good time to start projects, studies, marriage talks, property and long-term investments: act on opportunities, keep your word and share your success.', ta: 'இரு கால நாதர்களும் உங்கள் ஜாதகத்திற்குச் சாதகம். புதிய முயற்சிகள், படிப்பு, திருமணப் பேச்சு, சொத்து, நீண்டகால முதலீடுகளுக்கு நல்ல நேரம்: வாய்ப்புகளைப் பயன்படுத்துங்கள், வாக்குக் காப்பாற்றுங்கள், வெற்றியைப் பகிருங்கள்.' },
      mixed: { title: { en: 'A mixed period', ta: 'கலவையான காலம்' }, en: 'One period lord helps while the other tests you. Move forward with planning: finish existing commitments before taking new ones, read contracts carefully, and keep health and savings steady.', ta: 'ஒரு கால நாதர் உதவுகிறார், மற்றவர் சோதிக்கிறார். திட்டமிட்டு முன்னேறுங்கள்: புதியவற்றுக்கு முன் இருக்கும் பொறுப்புகளை முடியுங்கள், ஒப்பந்தங்களைக் கவனமாகப் படியுங்கள், உடல்நலமும் சேமிப்பும் நிலையாக இருக்கட்டும்.' },
      hard: { title: { en: 'A period for patience', ta: 'பொறுமைக்கான காலம்' }, en: 'Both period lords are challenging for your Lagna. Consolidate rather than expand: avoid speculation, big loans and confrontations, look after your health, and lean on routine, prayer and trusted advice — this phase builds resilience.', ta: 'இரு கால நாதர்களும் உங்கள் லக்னத்திற்குச் சவாலானவர்கள். விரிவாக்கத்தை விட நிலைப்படுத்துங்கள்: ஊக வணிகம், பெரிய கடன், மோதல்களைத் தவிர்க்கவும்; உடல்நலம் காக்கவும்; ஒழுங்கு, வழிபாடு, நம்பகமான ஆலோசனையைச் சார்ந்திருங்கள் — இக்காலம் மன உறுதியை வளர்க்கும்.' }
    },
    antaram: { en: 'Within it, the {p} antaram runs until {x}.', ta: 'இதற்குள் {p} அந்தரம் {x} வரை நடைபெறும்.' },
    next: { en: 'Next comes the {p} bhukti, from {x}.', ta: 'அடுத்து {x} முதல் {p} புத்தி.' },
    nextMaha: { en: 'The {p} Maha Dasha follows from {x}.', ta: '{x} முதல் {p} மகா தசை தொடங்கும்.' },
    remedyTitle: { en: 'Suggested remedies (pariharam)', ta: 'பரிகாரங்கள்' },
    beforeBirth: { en: 'This chart’s dasha cycle has not reached today’s date.', ta: 'இந்த ஜாதகத்தின் தசா சுழற்சி இன்றைய தேதியை எட்டவில்லை.' }
  };

  K.remedy = {
    Sun: { en: 'Offer water to the rising Sun and recite the Aditya Hrudayam on Sundays; honour your father and elders. Navagraha sthalam: Suriyanar Koil.', ta: 'ஞாயிற்றுக்கிழமைகளில் உதய சூரியனுக்கு அர்க்கியம், ஆதித்ய ஹ்ருதயம் பாராயணம்; தந்தை, பெரியோரை மதித்தல். நவக்கிரக ஸ்தலம்: சூரியனார் கோயில்.' },
    Moon: { en: 'Worship Ambal (Goddess Parvati) on Mondays, keep a calm routine and give milk or rice to those in need. Navagraha sthalam: Thingalur.', ta: 'திங்கள்கிழமை அம்பாள் வழிபாடு, அமைதியான வழக்கம், தேவைப்படுவோருக்கு பால் அல்லது அரிசி தானம். நவக்கிரக ஸ்தலம்: திங்களூர்.' },
    Mars: { en: 'Worship Lord Murugan on Tuesdays with the Skanda Sashti Kavacham, practise patience and donate red lentils (thuvaram paruppu). Navagraha sthalam: Vaitheeswaran Koil.', ta: 'செவ்வாய்க்கிழமை கந்த சஷ்டி கவசத்துடன் முருகன் வழிபாடு, பொறுமைப் பயிற்சி, துவரம் பருப்பு தானம். நவக்கிரக ஸ்தலம்: வைத்தீஸ்வரன் கோயில்.' },
    Mercury: { en: 'Worship Lord Perumal on Wednesdays, recite the Vishnu Sahasranamam, donate green gram (pachai payaru) and help students. Navagraha sthalam: Thiruvenkadu.', ta: 'புதன்கிழமை பெருமாள் வழிபாடு, விஷ்ணு சகஸ்ரநாமம் பாராயணம், பச்சைப் பயறு தானம், மாணவர்களுக்கு உதவுதல். நவக்கிரக ஸ்தலம்: திருவெண்காடு.' },
    Jupiter: { en: 'Worship Dakshinamurthy on Thursdays, respect your teachers and donate Bengal gram (kondai kadalai) or yellow cloth. Navagraha sthalam: Alangudi.', ta: 'வியாழக்கிழமை தட்சிணாமூர்த்தி வழிபாடு, ஆசிரியர்களை மதித்தல், கொண்டைக்கடலை அல்லது மஞ்சள் வஸ்திரம் தானம். நவக்கிரக ஸ்தலம்: ஆலங்குடி.' },
    Venus: { en: 'Worship Mahalakshmi on Fridays, keep your home clean and beautiful, and give rice or clothes to women in need. Navagraha sthalam: Kanjanur.', ta: 'வெள்ளிக்கிழமை மகாலட்சுமி வழிபாடு, வீட்டைத் தூய்மையாகவும் அழகாகவும் வைத்தல், தேவைப்படும் பெண்களுக்கு அரிசி அல்லது ஆடை தானம். நவக்கிரக ஸ்தலம்: கஞ்சனூர்.' },
    Saturn: { en: 'Light a sesame-oil lamp for Saneeswarar or worship Anjaneyar on Saturdays, serve the elderly and labourers, and donate black sesame (ellu). Navagraha sthalam: Thirunallar.', ta: 'சனிக்கிழமை சனீஸ்வரருக்கு நல்லெண்ணெய் தீபம் அல்லது ஆஞ்சநேயர் வழிபாடு, முதியோர், உழைப்பாளர்களுக்குச் சேவை, எள் தானம். நவக்கிரக ஸ்தலம்: திருநள்ளாறு.' },
    Rahu: { en: 'Worship Goddess Durga during Rahu kalam, especially on Tuesdays and Fridays, and donate black gram (ulundhu). Navagraha sthalam: Thirunageswaram.', ta: 'ராகு காலத்தில், குறிப்பாக செவ்வாய், வெள்ளிக்கிழமைகளில் துர்கை வழிபாடு, உளுந்து தானம். நவக்கிரக ஸ்தலம்: திருநாகேஸ்வரம்.' },
    Ketu: { en: 'Worship Lord Vinayagar, practise meditation and donate horse gram (kollu) or a multi-coloured cloth. Navagraha sthalam: Keezhaperumpallam.', ta: 'விநாயகர் வழிபாடு, தியானம், கொள்ளு அல்லது பல வண்ண வஸ்திரம் தானம். நவக்கிரக ஸ்தலம்: கீழப்பெரும்பள்ளம்.' }
  };
  K.gemNote = { en: 'The traditional gem for {p} is {x}; wear one only after a qualified astrologer has examined the whole chart.', ta: '{p}-க்கு பாரம்பரிய ரத்தினம் {x}; முழு ஜாதகத்தையும் தகுதியான ஜோதிடர் ஆராய்ந்த பின்பே அணியவும்.' };

  /* ================================================================ TRANSITS (GOCHARA) */
  const tr = (rows) => rows.map((r) => (r.length === 4 ? { title: { en: r[0], ta: r[1] }, en: r[2], ta: r[3] } : { en: r[0], ta: r[1] }));
  K.transit = {
    saturn: tr([
      ['Janma Sani — Ezharai Sani, peak phase', 'ஜென்மச் சனி — ஏழரைச் சனியின் உச்ச கட்டம்',
        'Saturn is transiting your Janma Rasi, the middle and most intense phase of Ezharai Sani: pressure on health and mind, heavy responsibility and slower results. Simplify, rest well and keep faith — effort made now pays off later.',
        'சனி உங்கள் ஜென்ம ராசியில் சஞ்சரிக்கிறார் — ஏழரைச் சனியின் நடுப்பகுதி, தீவிரமான கட்டம்: உடல், மன அழுத்தம், அதிகப் பொறுப்பு, மெதுவான பலன். எளிமையாக வாழ்ந்து, நன்கு ஓய்வெடுத்து, நம்பிக்கையுடன் இருங்கள் — இப்போதைய உழைப்பு பின்னர் பலன் தரும்.'],
      ['Paadha Sani — Ezharai Sani, last phase', 'பாதச் சனி — ஏழரைச் சனியின் கடைசிக் கட்டம்',
        'Saturn is in the 2nd from your Moon, the final phase of Ezharai Sani. Family finances and speech need care; the pressure is easing, so tidy up debts and keep your words gentle.',
        'சனி உங்கள் ராசிக்கு 2-இல் — ஏழரைச் சனியின் இறுதிக் கட்டம். குடும்பப் பொருளாதாரமும் பேச்சும் கவனம் தேவை; அழுத்தம் குறைந்து வருகிறது — கடன்களை ஒழுங்குபடுத்தி, சொல்லில் மென்மை காக்கவும்.'],
      ['Saturn in the 3rd from your Moon is one of its best transits: courage, success over obstacles, gains from effort and help from colleagues.',
        'சனி உங்கள் ராசிக்கு 3-இல் — சிறந்த கோசாரங்களில் ஒன்று: தைரியம், தடைகளை வெல்லுதல், உழைப்பால் லாபம், சக பணியாளர் உதவி.'],
      ['Ardhashtama Sani', 'அர்த்தாஷ்டமச் சனி',
        'Saturn in the 4th from your Moon can unsettle home, mother’s health, property and peace of mind; avoid hasty property deals and protect your rest.',
        'சனி உங்கள் ராசிக்கு 4-இல்: வீடு, தாயின் உடல்நலம், சொத்து, மன அமைதியில் சலனம் வரலாம்; அவசர சொத்து பரிவர்த்தனையைத் தவிர்த்து ஓய்வைக் காக்கவும்.'],
      ['Saturn in the 5th from your Moon asks for care with children, studies and speculation; think twice before big decisions.',
        'சனி உங்கள் ராசிக்கு 5-இல்: குழந்தைகள், படிப்பு, ஊக முதலீடுகளில் கவனம்; பெரிய முடிவுகளுக்கு முன் இருமுறை யோசியுங்கள்.'],
      ['Saturn in the 6th from your Moon is excellent: victory over rivals and illness, debts cleared and success in competition and service.',
        'சனி உங்கள் ராசிக்கு 6-இல் — மிகச் சிறப்பு: எதிரிகள், நோய்கள் மீது வெற்றி, கடன் தீர்வு, போட்டி மற்றும் சேவையில் வெற்றி.'],
      ['Kandaka Sani', 'கண்டகச் சனி',
        'Saturn in the 7th from your Moon tests partnerships and marriage and brings travel; patience with your spouse and clear contracts help.',
        'சனி உங்கள் ராசிக்கு 7-இல்: கூட்டுறவு, திருமண உறவுகளைச் சோதிக்கும்; பயணங்கள் வரும்; துணையிடம் பொறுமையும் தெளிவான ஒப்பந்தங்களும் உதவும்.'],
      ['Ashtama Sani', 'அஷ்டமச் சனி',
        'Saturn in the 8th from your Moon brings obstacles, delays and health sensitivity; avoid risks, drive carefully and keep up regular check-ups — it passes.',
        'சனி உங்கள் ராசிக்கு 8-இல்: தடைகள், தாமதம், உடல்நல எச்சரிக்கை; ஆபத்துகளைத் தவிர்த்து, கவனமாக வாகனம் ஓட்டி, முறையான பரிசோதனை செய்யவும் — இதுவும் கடந்து போகும்.'],
      ['Saturn in the 9th from your Moon can delay luck and strain ties with father or teachers; steady dharma and patience keep fortune intact.',
        'சனி உங்கள் ராசிக்கு 9-இல்: பாக்கியம் தாமதமாகலாம்; தந்தை, குருவுடனான உறவில் சிறு சுமை; நிலையான தர்மமும் பொறுமையும் அதிர்ஷ்டத்தைக் காக்கும்.'],
      ['Saturn in the 10th from your Moon increases workload and responsibility; honest hard work brings recognition, but avoid shortcuts.',
        'சனி உங்கள் ராசிக்கு 10-இல்: பணிச்சுமையும் பொறுப்பும் கூடும்; நேர்மையான உழைப்பு அங்கீகாரம் தரும் — குறுக்கு வழிகள் வேண்டாம்.'],
      ['Saturn in the 11th from your Moon is very favourable: steady gains, fulfilled ambitions and support from friends and seniors.',
        'சனி உங்கள் ராசிக்கு 11-இல் — மிகவும் சாதகம்: நிலையான லாபம், லட்சியங்கள் நிறைவேறுதல், நண்பர்கள், மூத்தோர் ஆதரவு.'],
      ['Viraya Sani — Ezharai Sani, first phase', 'விரயச் சனி — ஏழரைச் சனியின் முதல் கட்டம்',
        'Saturn is in the 12th from your Moon, the opening phase of Ezharai Sani. Expect higher expenses, travel and disturbed sleep; spend carefully and avoid standing surety for others.',
        'சனி உங்கள் ராசிக்கு 12-இல் — ஏழரைச் சனியின் தொடக்கக் கட்டம். செலவு, பயணம், உறக்கக் குறைவு வரலாம்; கவனமாகச் செலவிட்டு, பிறருக்கு ஜாமீன் நிற்பதைத் தவிர்க்கவும்.']
    ]),
    jupiter: tr([
      ['Jupiter over your Janma Rasi brings some restlessness and changes of place; keep expenses and health in check.', 'குரு ஜென்ம ராசியில்: சிறு அமைதியின்மை, இட மாற்றம்; செலவும் உடல்நலமும் கவனிக்கவும்.'],
      ['Jupiter in the 2nd from your Moon is favourable: family happiness, income, pleasant speech and auspicious events.', 'குரு ராசிக்கு 2-இல் — சாதகம்: குடும்ப மகிழ்ச்சி, வருமானம், இனிய பேச்சு, சுப நிகழ்வுகள்.'],
      ['Jupiter in the 3rd from your Moon can slow plans and bring minor obstacles; steady effort keeps things moving.', 'குரு ராசிக்கு 3-இல்: திட்டங்கள் சற்று மெதுவாகலாம், சிறு தடைகள்; விடாமுயற்சி முன்னேற்றம் தரும்.'],
      ['Jupiter in the 4th from your Moon brings domestic duties and some worry over home or property; avoid overcommitting.', 'குரு ராசிக்கு 4-இல்: வீட்டுப் பொறுப்புகள், வீடு அல்லது சொத்து குறித்த சிறு கவலை; அதிகப் பொறுப்பேற்பதைத் தவிர்க்கவும்.'],
      ['Jupiter in the 5th from your Moon is excellent: good news about children, success in studies, romance and wise investments.', 'குரு ராசிக்கு 5-இல் — மிகச் சிறப்பு: குழந்தைகள் பற்றிய நற்செய்தி, கல்வியில் வெற்றி, காதல், புத்திசாலித்தனமான முதலீடுகள்.'],
      ['Jupiter in the 6th from your Moon calls for care with health, debts and rivals; avoid lending and arguments.', 'குரு ராசிக்கு 6-இல்: உடல்நலம், கடன், எதிரிகளில் கவனம்; கடன் கொடுப்பதையும் வாக்குவாதத்தையும் தவிர்க்கவும்.'],
      ['Jupiter in the 7th from your Moon is favourable for marriage, partnerships, travel and public recognition.', 'குரு ராசிக்கு 7-இல் — திருமணம், கூட்டுறவு, பயணம், பொது அங்கீகாரத்திற்குச் சாதகம்.'],
      ['Jupiter in the 8th from your Moon can bring unexpected expenses and delays; protect savings and avoid risky moves.', 'குரு ராசிக்கு 8-இல்: எதிர்பாராத செலவு, தாமதம்; சேமிப்பைக் காத்து ஆபத்தான முடிவுகளைத் தவிர்க்கவும்.'],
      ['Jupiter in the 9th from your Moon is excellent: fortune, blessings of elders, pilgrimages and progress in dharma and career.', 'குரு ராசிக்கு 9-இல் — மிகச் சிறப்பு: பாக்கியம், பெரியோர் ஆசி, புனிதப் பயணம், தர்மம் மற்றும் தொழிலில் முன்னேற்றம்.'],
      ['Jupiter in the 10th from your Moon brings changes at work; stay flexible and protect your reputation.', 'குரு ராசிக்கு 10-இல்: பணியில் மாற்றங்கள்; நெகிழ்வாக இருந்து நற்பெயரைக் காக்கவும்.'],
      ['Jupiter in the 11th from your Moon is very favourable: gains, fulfilled wishes, new friendships and promotions.', 'குரு ராசிக்கு 11-இல் — மிகவும் சாதகம்: லாபம், ஆசைகள் நிறைவேறுதல், புதிய நட்பு, பதவி உயர்வு.'],
      ['Jupiter in the 12th from your Moon raises expenses, often on good causes or travel; budget well and focus on spiritual growth.', 'குரு ராசிக்கு 12-இல்: செலவு கூடும், பெரும்பாலும் நற்காரியங்கள் அல்லது பயணத்திற்கு; திட்டமிட்டு செலவிட்டு ஆன்மிக வளர்ச்சியில் கவனம் செலுத்துங்கள்.']
    ]),
    rahuGood: { en: 'Rahu is transiting the {h} house from your Moon — a favourable position (3rd, 6th or 11th) for ambition and gains.', ta: 'ராகு உங்கள் ராசிக்கு {h}-ஆம் வீட்டில் சஞ்சரிக்கிறார் — லட்சியம், லாபத்திற்குச் சாதகமான இடம் (3, 6, 11).' },
    rahuOther: { en: 'Rahu is transiting the {h} house from your Moon: stay grounded, verify opportunities and avoid shortcuts in matters of {x}.', ta: 'ராகு உங்கள் ராசிக்கு {h}-ஆம் வீட்டில் சஞ்சரிக்கிறார்: {x} — இவ்விஷயங்களில் நிதானமாக இருந்து, வாய்ப்புகளைச் சரிபார்த்து, குறுக்கு வழிகளைத் தவிர்க்கவும்.' },
    until: { en: 'In {s} until about {x}.', ta: 'சுமார் {x} வரை {sl}.' },
    sadeNote: { en: 'Ezharai Sani lasts while Saturn crosses the 12th, 1st and 2nd signs from the Moon — about seven and a half years.', ta: 'சனி சந்திரனுக்கு 12, 1, 2 ஆகிய ராசிகளைக் கடக்கும் சுமார் ஏழரை ஆண்டுகள் ஏழரைச் சனி.' },
    title: { en: 'Current transits (gochara)', ta: 'தற்போதைய கோசாரம்' },
    saturnTitle: { en: 'Saturn transit', ta: 'சனி கோசாரம்' },
    jupiterTitle: { en: 'Jupiter transit', ta: 'குரு கோசாரம்' },
    rahuTitle: { en: 'Rahu–Ketu transit', ta: 'ராகு–கேது கோசாரம்' },
    fromMoon: { en: '{x} from your Moon', ta: 'ராசிக்கு {x}-இல்' }
  };

  /* ================================================================ REPORT LABELS */
  Object.assign(K.ui, {
    cStar: { en: 'Janma Nakshatra', ta: 'ஜன்ம நட்சத்திரம்' },
    cRasi: { en: 'Janma Rasi (Moon sign)', ta: 'ஜன்ம ராசி' },
    cLucky: { en: 'Lucky factors', ta: 'அதிர்ஷ்டக் குறிப்புகள்' },
    cLagna: { en: 'Lagna', ta: 'லக்னம்' },
    cLagnaLord: { en: 'Lagnadhipathi (Lagna lord)', ta: 'லக்னாதிபதி' },
    cFunctional: { en: 'Planets for your Lagna', ta: 'உங்கள் லக்னத்திற்கு கிரகங்களின் தன்மை' },
    cCareer: { en: 'Career & status', ta: 'தொழில் & அந்தஸ்து' },
    cWealth: { en: 'Wealth & finance', ta: 'தனம் & பொருளாதாரம்' },
    cMarriage: { en: 'Marriage & relationships', ta: 'திருமணம் & உறவுகள்' },
    cHealth: { en: 'Health & vitality', ta: 'உடல்நலம்' },
    cMaha: { en: 'Maha Dasha', ta: 'மகா தசை' },
    cBhukti: { en: 'Bhukti', ta: 'புத்தி' },
    cGuidance: { en: 'Guidance for this period', ta: 'இக்காலத்திற்கான வழிகாட்டல்' },
    fDeity: { en: 'Deity', ta: 'அதிதேவதை' }, fSymbol: { en: 'Symbol', ta: 'சின்னம்' }, fNakLord: { en: 'Star lord', ta: 'நட்சத்திர அதிபதி' },
    fGana: { en: 'Gana', ta: 'கணம்' }, fYoni: { en: 'Yoni', ta: 'யோனி' }, fNadi: { en: 'Nadi', ta: 'நாடி' }, fTatva: { en: 'Tatva (element)', ta: 'தத்துவம் (பூதம்)' },
    fRasiLord: { en: 'Rasi lord', ta: 'ராசி அதிபதி' }, fColors: { en: 'Lucky colours', ta: 'அதிர்ஷ்ட நிறங்கள்' }, fNumbers: { en: 'Lucky numbers', ta: 'அதிர்ஷ்ட எண்கள்' },
    fDays: { en: 'Favourable days', ta: 'சாதகமான கிழமைகள்' }, fGem: { en: 'Traditional gems', ta: 'பாரம்பரிய ரத்தினங்கள்' },
    fSign: { en: 'Sign', ta: 'ராசி' }, fDegree: { en: 'Degree', ta: 'பாகை' }, fLord: { en: 'Lord', ta: 'அதிபதி' }, fPlacement: { en: 'Placement', ta: 'நிலை' },
    fStrength: { en: 'Strength', ta: 'பலம்' }, fTenth: { en: '10th house', ta: '10-ஆம் வீடு' }, fTenthLord: { en: '10th lord', ta: '10-ஆம் அதிபதி' },
    fSecond: { en: '2nd lord', ta: '2-ஆம் அதிபதி' }, fEleventh: { en: '11th lord', ta: '11-ஆம் அதிபதி' }, fSeventh: { en: '7th house', ta: '7-ஆம் வீடு' },
    fSeventhLord: { en: '7th lord', ta: '7-ஆம் அதிபதி' }, fKaraka: { en: 'Karaka', ta: 'காரகன்' }, fSixth: { en: '6th house', ta: '6-ஆம் வீடு' }, fEighth: { en: '8th house', ta: '8-ஆம் வீடு' },
    fPeriod: { en: 'Period', ta: 'காலம்' }, fRole: { en: 'Role for your Lagna', ta: 'லக்னத்திற்கு தன்மை' },
    gYogakaraka: { en: 'Yogakaraka', ta: 'யோககாரகன்' }, gBenefics: { en: 'Benefics', ta: 'சுபர்கள்' }, gMalefics: { en: 'Malefics', ta: 'பாபர்கள்' },
    gNeutral: { en: 'Neutral', ta: 'சமர்கள்' }, gMarakas: { en: 'Marakas', ta: 'மாரகர்கள்' },
    strong: { en: 'Strong', ta: 'பலம்' }, mid: { en: 'Moderate', ta: 'மிதம்' }, weak: { en: 'Weak', ta: 'பலவீனம்' },
    inHouse: { en: 'house {h}', ta: '{h}-ஆம் வீடு' },
    and: { en: 'and', ta: 'மற்றும்' },
    functionalNote: { en: 'Following Parashara, a planet’s nature for your chart comes from the houses it rules from the Lagna: trine lords (1, 5, 9) help, lords of 3, 6, 8 and 11 bring trouble, and ruling a kendra takes away the goodness of natural benefics. House numbers are in brackets.', ta: 'பராசரர் முறைப்படி, ஒரு கிரகத்தின் தன்மை லக்னத்திலிருந்து அது ஆளும் வீடுகளைப் பொறுத்தது: திரிகோண (1, 5, 9) அதிபதிகள் நன்மை செய்வர்; 3, 6, 8, 11 அதிபதிகள் சிரமம் தருவர்; கேந்திராதிபத்தியம் இயற்கைச் சுபர்களின் நன்மையைக் குறைக்கும். அடைப்புக்குறியில் வீட்டு எண்கள்.' }
  });

  /* ================================================================ FUTURE (year-by-year forecast) */
  K.future = {
    ui: {
      title: { en: 'Your future, year by year', ta: 'எதிர்கால பலன் — ஆண்டு வாரியாக' },
      sub: { en: 'Twelve years ahead, read from your dasha periods and the transits of Jupiter, Saturn and Rahu over your Moon sign and Lagna. Tap a year for its full reading.', ta: 'உங்கள் தசா புத்திகளும், சந்திர ராசி மற்றும் லக்னத்தின் மீது குரு, சனி, ராகு கோசாரங்களும் அடிப்படையாக அடுத்த 12 ஆண்டுகள். முழு பலனுக்கு ஓர் ஆண்டைத் தொடவும்.' },
      chartTitle: { en: 'Fortune index, month by month', ta: 'மாதவாரி அதிர்ஷ்டக் குறியீடு' },
      chartNote: { en: '0–100 · above 50 leans favourable, below 50 asks for care', ta: '0–100 · 50-க்கு மேல் சாதகம், கீழே கவனம் தேவை' },
      bandDasha: { en: 'Dasha · Bhukti', ta: 'தசை · புத்தி' },
      bandSaturn: { en: 'Saturn from Moon', ta: 'ராசிக்கு சனி' },
      bandJupiter: { en: 'Jupiter from Moon', ta: 'ராசிக்கு குரு' },
      tableView: { en: 'Table view of all twelve years', ta: '12 ஆண்டுகளின் அட்டவணை' },
      thYear: { en: 'Year', ta: 'ஆண்டு' }, overall: { en: 'Overall', ta: 'ஒட்டுமொத்தம்' },
      periods: { en: 'Dasha periods this year', ta: 'இந்த ஆண்டின் தசா புத்திகள்' },
      transits: { en: 'Major transits', ta: 'முக்கிய கோசாரங்கள்' },
      areas: { en: 'Life areas', ta: 'வாழ்க்கை அம்சங்கள்' },
      months: { en: 'Month by month', ta: 'மாதவாரியாக' },
      keyDates: { en: 'Key dates', ta: 'முக்கிய தேதிகள்' },
      remedies: { en: 'Remedies for the year', ta: 'இந்த ஆண்டுக்கான பரிகாரங்கள்' },
      bhuktiTitle: { en: 'Period by period', ta: 'புத்தி வாரியாக' },
      bhuktiSub: { en: 'Every bhukti in these twelve years, with the life areas it switches on. Tap one to open it.', ta: 'இந்த 12 ஆண்டுகளின் ஒவ்வொரு புத்தியும், அது தூண்டும் வாழ்க்கை அம்சங்களும். திறக்க ஒன்றைத் தொடவும்.' },
      activates: { en: 'Areas this period switches on', ta: 'இக்காலம் தூண்டும் அம்சங்கள்' },
      antarams: { en: 'Antarams (sub-periods)', ta: 'அந்தரங்கள்' },
      backdrop: { en: 'Transit backdrop', ta: 'கோசாரப் பின்னணி' },
      best: { en: 'Best months', ta: 'சிறந்த மாதங்கள்' }, caution: { en: 'Take care in', ta: 'கவனம் தேவைப்படும் மாதங்கள்' },
      why: { en: 'Why', ta: 'காரணம்' },
      levels: { good: { en: 'Favourable', ta: 'சாதகம்' }, mixed: { en: 'Mixed', ta: 'கலவை' }, tough: { en: 'Testing', ta: 'சோதனை' } },
      score: { en: 'Score', ta: 'மதிப்பெண்' },
      today: { en: 'Today', ta: 'இன்று' },
      fromMoon: { en: '{x} from Moon', ta: 'ராசிக்கு {x}' },
      fromLagna: { en: '{x} from Lagna', ta: 'லக்னத்திற்கு {x}' },
      startOfYear: { en: 'the start of the year', ta: 'ஆண்டின் தொடக்கம்' },
      until: { en: 'until {x}', ta: '{x} வரை' },
      noPeriod: { en: 'Outside the 120-year dasha cycle.', ta: '120 ஆண்டு தசா சுழற்சிக்கு வெளியே.' },
      shareWa: { en: 'Share on WhatsApp', ta: 'வாட்ஸ்அப்பில் பகிர்' },
      shareText: { en: 'My Jathagam on Thudinest Josiyam — Rasi, Navamsam, dasha and a 12-year forecast in English & Tamil:', ta: 'துடிநெஸ்ட் ஜோசியத்தில் என் ஜாதகம் — ராசி, நவாம்சம், தசை, 12 ஆண்டு பலன் (தமிழ் & ஆங்கிலம்):' },
      shareApp: { en: 'Free South Indian Jathagam in English & Tamil — Rasi, Navamsam, dasha and 12-year palan:', ta: 'இலவச தென்னிந்திய ஜாதகம் — ராசி, நவாம்சம், தசை, 12 ஆண்டு பலன், தமிழிலும் ஆங்கிலத்திலும்:' }
    },
    yearLevel: [
      { title: { en: 'An excellent year', ta: 'மிகச் சிறந்த ஆண்டு' }, en: 'The year’s dasha lords and transits pull in the same direction. Openings can arrive in several areas at once — make the big moves, sign the important papers and invest in long-term goals, while staying humble and generous.', ta: 'இந்த ஆண்டின் தசா நாதர்களும் கோசாரங்களும் ஒரே திசையில் செயல்படுகின்றன. பல துறைகளில் ஒரே நேரத்தில் வாய்ப்புகள் திறக்கும் — பெரிய முடிவுகள், முக்கிய ஒப்பந்தங்கள், நீண்டகால இலக்குகளுக்கான முதலீடுகளுக்கு ஏற்ற காலம்; பணிவும் தாராளமும் காக்கவும்.' },
      { title: { en: 'A favourable year', ta: 'சாதகமான ஆண்டு' }, en: 'More support than resistance. Progress comes steadily if you keep to a plan; use the best months below for launches, interviews, purchases and auspicious events.', ta: 'எதிர்ப்பை விட ஆதரவு அதிகம். திட்டப்படி செயல்பட்டால் முன்னேற்றம் நிலையாக வரும்; கீழே உள்ள சிறந்த மாதங்களை புதிய தொடக்கங்கள், நேர்காணல்கள், பொருள் வாங்குதல், சுப நிகழ்வுகளுக்குப் பயன்படுத்துங்கள்.' },
      { title: { en: 'A balanced year', ta: 'சமநிலையான ஆண்டு' }, en: 'Gains and tests arrive in roughly equal measure. Choose your battles: push forward in the areas marked favourable and hold steady where the reading asks for care.', ta: 'லாபங்களும் சோதனைகளும் ஏறக்குறைய சம அளவில் வரும். சாதகம் எனக் குறிக்கப்பட்ட அம்சங்களில் முன்னேறுங்கள்; கவனம் தேவை என்ற இடங்களில் நிதானமாக இருங்கள்.' },
      { title: { en: 'A testing year', ta: 'சோதனையான ஆண்டு' }, en: 'Results need effort this year. Consolidate rather than expand, keep savings and health routines strong and avoid hasty commitments — steady work now builds the next rise.', ta: 'இந்த ஆண்டு பலனுக்கு முயற்சி தேவை. விரிவாக்கத்தை விட நிலைப்படுத்துங்கள்; சேமிப்பையும் உடல்நலப் பழக்கங்களையும் வலுப்படுத்துங்கள்; அவசர ஒப்பந்தங்களைத் தவிர்க்கவும் — இப்போதைய நிலையான உழைப்பு அடுத்த உயர்வைக் கட்டும்.' },
      { title: { en: 'A demanding year', ta: 'கடினமான ஆண்டு' }, en: 'Several heavy influences overlap. Protect your health first, avoid risk, debt and disputes, lean on family and trusted advisers and keep up the remedies below. Hard years pass and leave real strength behind.', ta: 'பல கடுமையான தாக்கங்கள் ஒன்றாக வருகின்றன. முதலில் உடல்நலத்தைக் காக்கவும்; ஆபத்து, கடன், வழக்குகளைத் தவிர்க்கவும்; குடும்பம், நம்பகமான ஆலோசகர்களைச் சார்ந்திருங்கள்; கீழே உள்ள பரிகாரங்களைத் தொடருங்கள். கடினமான ஆண்டுகள் கடந்து உண்மையான வலிமையை விட்டுச் செல்லும்.' }
    ],
    dashaYear: { en: 'Through {x} you are in the {p} Maha Dasha.', ta: '{x} முழுவதும் {p} மகா தசை நடைபெறுகிறது.' },
    dashaTurn: { en: 'On {x} the {p} Maha Dasha ends and the {q} Maha Dasha begins — a major turning point in life.', ta: '{x} அன்று {p} மகா தசை முடிந்து {q} மகா தசை தொடங்குகிறது — வாழ்க்கையில் ஒரு முக்கியத் திருப்பம்.' },
    transitFrom: { en: 'From {x}:', ta: '{x} முதல்:' },
    area: {
      career: { name: { en: 'Career & status', ta: 'தொழில் & அந்தஸ்து' },
        good: { en: 'Work goes well: recognition, responsibility and, for many, a promotion, new role or business growth. Put yourself forward for leadership and visible projects.', ta: 'பணியில் நல்ல முன்னேற்றம்: அங்கீகாரம், பொறுப்பு, பலருக்கு பதவி உயர்வு, புதிய பணி அல்லது தொழில் வளர்ச்சி. தலைமைப் பொறுப்புகளுக்கும் முக்கியத் திட்டங்களுக்கும் முன்வாருங்கள்.' },
        mixed: { en: 'Career moves forward in steps: some progress, some waiting. Upgrade your skills, record your achievements and change jobs only with a firm offer in hand.', ta: 'தொழில் படிப்படியாக முன்னேறும்: சில முன்னேற்றம், சில காத்திருப்பு. திறன்களை மேம்படுத்துங்கள், சாதனைகளைப் பதிவு செய்யுங்கள்; உறுதியான வாய்ப்பு கையில் இருந்தால் மட்டுமே வேலை மாறுங்கள்.' },
        tough: { en: 'Work asks for patience: a heavier load, slower recognition or friction with seniors. Stay disciplined and do not quit in frustration — this phase rewards persistence.', ta: 'பணியில் பொறுமை தேவை: அதிகச் சுமை, தாமதமான அங்கீகாரம் அல்லது மேலதிகாரிகளுடன் உரசல். ஒழுக்கமாக இருங்கள்; கோபத்தில் வேலையை விடாதீர்கள் — விடாமுயற்சிக்கு இக்காலம் பலன் தரும்.' } },
      wealth: { name: { en: 'Wealth & finance', ta: 'தனம் & பொருளாதாரம்' },
        good: { en: 'Income and savings grow; a good year for investing, clearing loans and buying assets — choose sound, long-term options.', ta: 'வருமானமும் சேமிப்பும் பெருகும்; முதலீடு, கடனடைப்பு, சொத்து வாங்குதலுக்கு நல்ல ஆண்டு — நிலையான நீண்டகால வழிகளைத் தேர்ந்தெடுக்கவும்.' },
        mixed: { en: 'Money comes and goes. Keep a budget, build an emergency fund and do not lend without documents.', ta: 'பணம் வந்து போகும். வரவு-செலவுத் திட்டம் வையுங்கள், அவசரகால நிதியை உருவாக்குங்கள், ஆவணமின்றி கடன் கொடுக்க வேண்டாம்.' },
        tough: { en: 'Expenses can outrun income. Postpone big purchases and speculation, avoid standing surety and protect your savings.', ta: 'செலவுகள் வருமானத்தை மிஞ்சலாம். பெரிய கொள்முதல், ஊக வணிகத்தைத் தள்ளிப்போடுங்கள்; ஜாமீன் நிற்பதைத் தவிர்த்து சேமிப்பைக் காக்கவும்.' } },
      love: { name: { en: 'Marriage & relationships', ta: 'திருமணம் & உறவுகள்' },
        good: { en: 'Relationships blossom. For the unmarried, marriage talks and engagements are favoured; for couples, closeness, celebrations and perhaps happy family news.', ta: 'உறவுகள் மலரும். திருமணமாகாதவர்களுக்கு திருமணப் பேச்சு, நிச்சயதார்த்தம் சாதகம்; தம்பதிகளுக்கு நெருக்கம், கொண்டாட்டங்கள், மகிழ்ச்சியான குடும்பச் செய்தி.' },
        mixed: { en: 'Relationships need attention: good moments alongside misunderstandings. Talk openly, give each other space and match horoscopes carefully before any commitment.', ta: 'உறவுகளில் கவனம் தேவை: இனிய தருணங்களுடன் சில தவறான புரிதல்களும். மனம் திறந்து பேசுங்கள், இடம் கொடுங்கள்; உறுதிமொழிக்கு முன் ஜாதகப் பொருத்தத்தைக் கவனமாகப் பாருங்கள்.' },
        tough: { en: 'Relationships are tested: distance, ego clashes or delays in marriage plans. Patience, kindness and avoiding harsh words will carry you through.', ta: 'உறவுகள் சோதிக்கப்படும்: பிரிவு, அகந்தை மோதல், திருமணத் திட்டங்களில் தாமதம். பொறுமை, அன்பு, கடுஞ்சொல் தவிர்த்தல் உங்களைக் கரைசேர்க்கும்.' } },
      health: { name: { en: 'Health & vitality', ta: 'உடல்நலம்' },
        good: { en: 'Good vitality and quick recovery. A fine year to build fitness habits that last.', ta: 'நல்ல உடல் வலிமையும் விரைவான குணமடைதலும். நீடிக்கும் உடற்பயிற்சிப் பழக்கங்களை உருவாக்க ஏற்ற ஆண்டு.' },
        mixed: { en: 'Health is steady with minor ups and downs; regular sleep, food and exercise keep it that way.', ta: 'சிறு ஏற்றத் தாழ்வுகளுடன் உடல்நலம் நிலையாக இருக்கும்; ஒழுங்கான உறக்கம், உணவு, உடற்பயிற்சி அதைக் காக்கும்.' },
        tough: { en: 'Energy may dip and old complaints can return. Keep up regular check-ups, avoid risky travel and stunts, and rest well.', ta: 'சக்தி குறையலாம்; பழைய பிரச்சினைகள் மீண்டும் வரலாம். முறையான பரிசோதனைகள், ஆபத்தான பயணம் தவிர்த்தல், நல்ல ஓய்வு அவசியம்.' } },
      home: { name: { en: 'Home, property & family', ta: 'வீடு, சொத்து & குடும்பம்' },
        good: { en: 'Domestic happiness and support from family; favourable for buying or renovating a home, a vehicle or land.', ta: 'குடும்ப மகிழ்ச்சியும் ஆதரவும்; வீடு, வாகனம், நிலம் வாங்குதல் அல்லது புதுப்பித்தலுக்குச் சாதகம்.' },
        mixed: { en: 'Home life is busy — repairs, responsibilities or a change of residence. Plan property matters carefully.', ta: 'வீட்டு வாழ்க்கை பரபரப்பாக இருக்கும் — பழுதுபார்ப்பு, பொறுப்புகள் அல்லது இட மாற்றம். சொத்து விஷயங்களைக் கவனமாகத் திட்டமிடுங்கள்.' },
        tough: { en: 'Domestic peace needs care; look after your parents’ health and avoid property disputes or rushed deals.', ta: 'குடும்ப அமைதியில் கவனம் தேவை; பெற்றோரின் உடல்நலத்தைக் கவனித்து, சொத்து தகராறுகளையும் அவசர பரிவர்த்தனைகளையும் தவிர்க்கவும்.' } },
      learning: { name: { en: 'Education & children', ta: 'கல்வி & குழந்தைகள்' },
        good: { en: 'Excellent for studies, exams, new courses and creative work, with good news concerning children.', ta: 'படிப்பு, தேர்வுகள், புதிய படிப்புகள், படைப்புப் பணிகளுக்கு மிகச் சிறப்பு; குழந்தைகள் பற்றிய நற்செய்தி.' },
        mixed: { en: 'Studies and children’s matters progress with effort; stay consistent and guide rather than pressure.', ta: 'படிப்பும் குழந்தைகள் விஷயங்களும் முயற்சியுடன் முன்னேறும்; தொடர்ச்சியாக இருங்கள், அழுத்தாமல் வழிநடத்துங்கள்.' },
        tough: { en: 'Concentration and results need extra work; avoid speculation and give children patient attention.', ta: 'கவனமும் தேர்வு முடிவுகளும் கூடுதல் உழைப்பைக் கோரும்; ஊக முதலீடுகளைத் தவிர்த்து குழந்தைகளுக்குப் பொறுமையான கவனம் கொடுங்கள்.' } },
      travel: { name: { en: 'Travel, fortune & spirituality', ta: 'பயணம், பாக்கியம் & ஆன்மிகம்' },
        good: { en: 'Fortune smiles: pilgrimages, foreign travel or opportunities abroad, and blessings from elders and teachers.', ta: 'அதிர்ஷ்டம் கைகூடும்: புனிதப் பயணம், வெளிநாட்டுப் பயணம் அல்லது வாய்ப்புகள், பெரியோர் மற்றும் குருவின் ஆசி.' },
        mixed: { en: 'Travel brings both gains and expense; spiritual practice steadies the mind.', ta: 'பயணங்கள் லாபமும் செலவும் தரும்; ஆன்மிகப் பயிற்சி மனதை நிலைப்படுத்தும்.' },
        tough: { en: 'Travel plans may be delayed or costly, so check documents twice. Quiet devotion and charity bring the best results.', ta: 'பயணத் திட்டங்கள் தாமதமாகலாம் அல்லது செலவு கூடலாம்; ஆவணங்களை இருமுறை சரிபாருங்கள். அமைதியான பக்தியும் தானமும் சிறந்த பலன் தரும்.' } }
    },
    why: {
      lord: { en: '{p} ({r}), your {x} lord, is tied to this area: it rules {y} and sits in the {h} house.', ta: '{x} நாதன் {p} ({r}) இந்த அம்சத்தோடு தொடர்புடையவர்: {y} அதிபதி, {h}-ஆம் வீட்டில் உள்ளார்.' },
      lordPlaced: { en: '{p} ({r}), your {x} lord, sits in the {h} house, which governs this area.', ta: '{x} நாதன் {p} ({r}) இந்த அம்சத்தைக் குறிக்கும் {h}-ஆம் வீட்டில் உள்ளார்.' },
      lordRules: { en: '{p} ({r}), your {x} lord, rules {y} and so steers this area.', ta: '{x} நாதன் {p} ({r}) இந்த அம்சத்தைக் குறிக்கும் {y} அதிபதி.' },
      karaka: { en: '{p}, the natural significator (karaka) of this area, runs as your {x} lord.', ta: 'இந்த அம்சத்தின் இயற்கைக் காரகன் {p} உங்கள் {x} நாதனாக நடைபெறுகிறார்.' },
      jupIn: { en: 'Jupiter transits your {h} house from {x}, blessing these matters.', ta: '{x} முதல் குரு உங்கள் {h}-ஆம் வீட்டில் சஞ்சரித்து இவ்விஷயங்களுக்கு அருள் தருவார்.' },
      jupAsp: { en: 'Jupiter aspects your {h} house from {x}, adding protection.', ta: '{x} முதல் குரு உங்கள் {h}-ஆம் வீட்டைப் பார்த்துப் பாதுகாப்பு தருவார்.' },
      satIn: { en: 'Saturn transits your {h} house from {x}, slowing these matters and asking for patience.', ta: '{x} முதல் சனி உங்கள் {h}-ஆம் வீட்டில் சஞ்சரிப்பதால் இவ்விஷயங்கள் மெதுவாகும்; பொறுமை தேவை.' },
      satGood: { en: 'Saturn transits your {h} house from {x}, rewarding steady effort here.', ta: '{x} முதல் சனி உங்கள் {h}-ஆம் வீட்டில் சஞ்சரித்து நிலையான முயற்சிக்குப் பலன் தருவார்.' },
      rahuIn: { en: 'Rahu crosses your {h} house from {x}: expect sudden changes or unusual openings.', ta: '{x} முதல் ராகு உங்கள் {h}-ஆம் வீட்டைக் கடக்கிறார்: திடீர் மாற்றங்கள் அல்லது வித்தியாசமான வாய்ப்புகள்.' },
      healthLord: { en: '{p}, your {x} lord, is linked to the 6th, 8th or 12th house, so guard your health in this period.', ta: '{x} நாதன் {p} 6, 8 அல்லது 12-ஆம் வீட்டோடு தொடர்புடையவர் — இக்காலத்தில் உடல்நலத்தைக் காக்கவும்.' },
      healthLagna: { en: '{p}, your Lagna lord, runs as your {x} lord, which supports vitality.', ta: 'உங்கள் லக்னாதிபதி {p} {x} நாதனாக நடைபெறுவதால் உடல் வலிமைக்கு ஆதரவு.' },
      sade: { en: 'Saturn is in the {h} sign from your Moon ({y}) from {x}, so pace yourself.', ta: '{x} முதல் சனி உங்கள் ராசிக்கு {h}-இல் ({y}) — நிதானமாகச் செயல்படுங்கள்.' },
      dasha: { en: 'dasha', ta: 'தசா' }, bhukti: { en: 'bhukti', ta: 'புத்தி' }
    },
    events: gb([
      ['Self & health: confidence, new beginnings and personal recognition', 'சுயம் & உடல்: தன்னம்பிக்கை, புதிய தொடக்கங்கள், தனிப்பட்ட அங்கீகாரம்'],
      ['Wealth & family: savings, income and family gatherings', 'தனம் & குடும்பம்: சேமிப்பு, வருமானம், குடும்ப ஒன்றுகூடல்கள்'],
      ['Courage & communication: initiative, short trips, media work and help from siblings', 'தைரியம் & தொடர்பு: முன்முயற்சி, குறுகிய பயணங்கள், ஊடகப் பணி, சகோதரர் உதவி'],
      ['Home & property: a new home, vehicle or land; comfort and peace', 'வீடு & சொத்து: புதிய வீடு, வாகனம் அல்லது நிலம்; சுகமும் அமைதியும்'],
      ['Children & intellect: studies, creativity, good news about children, wise investments', 'குழந்தைகள் & அறிவு: படிப்பு, படைப்பாற்றல், குழந்தைகள் பற்றிய நற்செய்தி, புத்திசாலித்தனமான முதலீடு'],
      ['Competition & service: victory over rivals, debts cleared, a new job', 'போட்டி & சேவை: எதிரிகள் மீது வெற்றி, கடன் தீர்வு, புதிய வேலை'],
      ['Marriage & partnership: marriage, engagement or a valuable business partner', 'திருமணம் & கூட்டு: திருமணம், நிச்சயதார்த்தம் அல்லது மதிப்புமிக்க கூட்டாளி'],
      ['Hidden gains: inheritance, insurance or a research breakthrough', 'மறைவான லாபம்: பரம்பரைச் சொத்து, காப்பீடு அல்லது ஆராய்ச்சியில் முன்னேற்றம்'],
      ['Fortune & dharma: luck, higher studies, long journeys, blessings of father and teachers', 'பாக்கியம் & தர்மம்: அதிர்ஷ்டம், உயர்கல்வி, தூரப் பயணம், தந்தை மற்றும் குருவின் ஆசி'],
      ['Career: promotion, recognition, a new role or business growth', 'தொழில்: பதவி உயர்வு, அங்கீகாரம், புதிய பொறுப்பு அல்லது தொழில் வளர்ச்சி'],
      ['Gains: higher income, wishes fulfilled, helpful friends', 'லாபம்: வருமான உயர்வு, ஆசைகள் நிறைவேறுதல், உதவும் நண்பர்கள்'],
      ['Foreign & spiritual: travel abroad, retreats, charity and restful sleep', 'வெளிநாடு & ஆன்மிகம்: வெளிநாட்டுப் பயணம், தியானம், தானம், நல்ல உறக்கம்']
    ]),
    eventsHard: gb([
      ['Self & health: fatigue or self-doubt — pace yourself', 'சுயம் & உடல்: சோர்வு அல்லது தயக்கம் — நிதானமாகச் செல்லுங்கள்'],
      ['Wealth & family: expenses and harsh words at home — budget and speak gently', 'தனம் & குடும்பம்: செலவுகள், வீட்டில் கடுஞ்சொற்கள் — திட்டமிட்டுச் செலவிட்டு மென்மையாகப் பேசுங்கள்'],
      ['Courage & communication: restless effort; avoid rash moves and quarrels with siblings', 'தைரியம் & தொடர்பு: அமைதியற்ற முயற்சி; அவசர முடிவுகளையும் சகோதரருடன் சண்டையையும் தவிர்க்கவும்'],
      ['Home & property: domestic worries, repairs or mother’s health', 'வீடு & சொத்து: குடும்பக் கவலைகள், பழுதுபார்ப்பு அல்லது தாயின் உடல்நலம்'],
      ['Children & intellect: worries over children or studies; avoid speculation', 'குழந்தைகள் & அறிவு: குழந்தைகள் அல்லது படிப்பு பற்றிய கவலை; ஊக முதலீடு தவிர்க்கவும்'],
      ['Health & debts: illness, loans or disputes need attention', 'உடல்நலம் & கடன்: நோய், கடன் அல்லது வழக்குகளில் கவனம் தேவை'],
      ['Marriage & partnership: strain or delays; handle disagreements calmly', 'திருமணம் & கூட்டு: உரசல் அல்லது தாமதம்; கருத்து வேறுபாடுகளை அமைதியாகக் கையாளுங்கள்'],
      ['Sudden events: health scares, losses or obstacles — avoid risks', 'திடீர் நிகழ்வுகள்: உடல்நல அச்சம், இழப்பு அல்லது தடைகள் — ஆபத்துகளைத் தவிர்க்கவும்'],
      ['Fortune & dharma: delayed luck or differences with father or teachers', 'பாக்கியம் & தர்மம்: தாமதமான அதிர்ஷ்டம் அல்லது தந்தை, குருவுடன் கருத்து வேறுபாடு'],
      ['Career: pressure at work, changes or friction with seniors', 'தொழில்: பணியில் அழுத்தம், மாற்றங்கள் அல்லது மேலதிகாரிகளுடன் உரசல்'],
      ['Gains: income with strings attached; choose friends carefully', 'லாபம்: நிபந்தனைகளுடன் வரும் வருமானம்; நண்பர்களைக் கவனமாகத் தேர்ந்தெடுங்கள்'],
      ['Expenses & losses: rising costs and poor sleep — spend carefully', 'செலவு & இழப்பு: கூடும் செலவு, உறக்கக் குறைவு — கவனமாகச் செலவிடுங்கள்']
    ]),
    month: {
      Sun: { good: { en: 'recognition and energy', ta: 'அங்கீகாரம், உற்சாகம்' }, bad: { en: 'ego clashes and fatigue', ta: 'அகந்தை மோதல், சோர்வு' } },
      Mars: { good: { en: 'courage, wins, property moves', ta: 'தைரியம், வெற்றி, சொத்து முயற்சிகள்' }, bad: { en: 'haste, disputes, injuries', ta: 'அவசரம், வாக்குவாதம், காயம்' } },
      Mercury: { good: { en: 'deals, studies, paperwork', ta: 'ஒப்பந்தங்கள், படிப்பு, ஆவணப் பணி' }, bad: { en: 'miscommunication, document errors', ta: 'தவறான புரிதல், ஆவணப் பிழைகள்' } },
      Venus: { good: { en: 'comforts, romance, purchases', ta: 'சுகம், காதல், பொருள் வாங்குதல்' }, bad: { en: 'overspending, relationship friction', ta: 'அதிகச் செலவு, உறவில் உரசல்' } }
    },
    ev: {
      maha: { en: '{p} Maha Dasha begins', ta: '{p} மகா தசை தொடக்கம்' },
      bhukti: { en: '{p} bhukti begins', ta: '{p} புத்தி தொடக்கம்' },
      ingress: { en: '{p} enters {s} — {x} from your Moon', ta: '{p} {sl} பிரவேசம் — ராசிக்கு {x}-இல்' },
      ingressShort: { en: '{p} enters {s}', ta: '{p} {sl} பிரவேசம்' }
    },
    cast: [
      { en: 'Reading the sky at your birth…', ta: 'உங்கள் பிறப்பு நேர வானத்தைப் படிக்கிறது…' },
      { en: 'Rising Lagna on the eastern horizon…', ta: 'கிழக்குத் தொடுவானில் லக்னம் கணிக்கிறது…' },
      { en: 'Placing the nine grahas…', ta: 'நவக்கிரகங்களை அமர்த்துகிறது…' },
      { en: 'Dividing the Navamsam…', ta: 'நவாம்சம் பிரிக்கிறது…' },
      { en: 'Unfolding 120 years of dasha…', ta: '120 ஆண்டு தசையை விரிக்கிறது…' },
      { en: 'Writing your palan…', ta: 'உங்கள் பலனை எழுதுகிறது…' }
    ]
  };
  Object.assign(K.ui, {
    navFuture: { en: 'Future', ta: 'எதிர்காலம்' },
    futureTitle: { en: 'Your future, year by year', ta: 'எதிர்கால பலன் — ஆண்டு வாரியாக' },
    futureSub: { en: 'Twelve years ahead, read from your dasha periods and the transits of Jupiter, Saturn and Rahu over your Moon sign and Lagna. Tap a year for its full reading.', ta: 'உங்கள் தசா புத்திகளும், சந்திர ராசி மற்றும் லக்னத்தின் மீது குரு, சனி, ராகு கோசாரங்களும் அடிப்படையாக அடுத்த 12 ஆண்டுகள். முழு பலனுக்கு ஓர் ஆண்டைத் தொடவும்.' },
    futureChart: { en: 'Fortune index, month by month', ta: 'மாதவாரி அதிர்ஷ்டக் குறியீடு' },
    futureChartNote: { en: '0–100 · above 50 leans favourable, below 50 asks for care', ta: '0–100 · 50-க்கு மேல் சாதகம், கீழே கவனம் தேவை' },
    futureTable: { en: 'Table view of all twelve years', ta: '12 ஆண்டுகளின் அட்டவணை' },
    futureBhukti: { en: 'Period by period', ta: 'புத்தி வாரியாக' },
    futureBhuktiSub: { en: 'Every bhukti in these twelve years, with the life areas it switches on. Tap one to open it.', ta: 'இந்த 12 ஆண்டுகளின் ஒவ்வொரு புத்தியும், அது தூண்டும் வாழ்க்கை அம்சங்களும். திறக்க ஒன்றைத் தொடவும்.' },
    shareWa: { en: 'Share on WhatsApp', ta: 'வாட்ஸ்அப்பில் பகிர்' },
    backTop: { en: 'Back to top', ta: 'மேலே செல்' },
    skipAnim: { en: 'Skip', ta: 'தவிர்' }
  });

  return K;
});
