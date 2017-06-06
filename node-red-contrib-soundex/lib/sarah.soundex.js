
// ------------------------------------------
//  CONVERT NUMBERS
// ------------------------------------------

var unites = function(number){
  var unite;
  switch(number){
    case 0: unite = "zéro";   break;
    case 1: unite = "un";     break;
    case 2: unite = "deux";   break;
    case 3: unite = "trois";  break;
    case 4: unite = "quatre"; break;
    case 5: unite = "cinq";   break;
    case 6: unite = "six";    break;
    case 7: unite = "sept";   break;
    case 8: unite = "huit";   break;
    case 9: unite = "neuf";   break;
  }
  return unite;
}

var dizaines = function(numbers){
  var dizaine;
  switch(numbers){
    case 10: dizaine = "dix";              break;
    case 11: dizaine = "onze";             break;
    case 12: dizaine = "douze";            break;
    case 13: dizaine = "treize";           break;
    case 14: dizaine = "quatorze";         break;
    case 15: dizaine = "quinze";           break;
    case 16: dizaine = "seize";            break;
    case 17: dizaine = "dix-sept";         break;
    case 18: dizaine = "dix-huit";         break;
    case 19: dizaine = "dix-neuf";         break;
    case 20: dizaine = "vingt";            break;
    case 30: dizaine = "trente";           break;
    case 40: dizaine = "quarante";         break;
    case 50: dizaine = "cinquante";        break;
    case 60: dizaine = "soixante";         break;
    case 70: dizaine = "soixante-dix";     break;
    case 80: dizaine = "quatre-vingt";     break;
    case 90: dizaine = "quatre-vingt-dix"; break;
  }
  return dizaine;
}

var number2letter = function(number){
  var letters = "";
  if (number > 999){ 
    letters += number > 1999 ? number2letter(Math.floor(number/1000)) : ''; 
    letters += "mille "; 
    number %= 1000; 
  }
  
  if (number >  99){ 
    letters += number > 199 ? number2letter(Math.floor(number/100)) : '';
    letters += "cent ";  
    number %= 100;  
  }
  
  if (number >  19){ letters += dizaines(number - number%10) + " "; number %= 10;   }
  if (number <  10){ letters += unites(number)   + " "; } else if (number <  20){ letters += dizaines(number)   + " "; }
  
  return letters;
}


                            
// ------------------------------------------
//  SOUNDEX
//  https://github.com/nick-keller/soundex-fr-bundle/blob/master/Services/SoundexFr.php
// ------------------------------------------

var ACCENT = {
  'Á' : 'A', 'À' : 'A', 'Ä' : 'A', 'Â' : 'A', 'Å' : 'A', 'Ã' : 'A', 
  'Æ' : 'E', 'É' : 'E', 'È' : 'E', 'Ë' : 'E','Ê' : 'E', 
  'Ï' : 'I', 'Î' : 'I', 'Ì' : 'I', 'Í' : 'I',
  'Ô' : 'O', 'Ö' : 'O', 'Ò' : 'O', 'Ó' : 'O', 'Õ' : 'O', 'Ø' : 'O', 'Œ' : 'OEU',
  'Ú' : 'U', 'Ù' : 'U', 'Û' : 'U', 'Ü' : 'U','Ñ' : 'N', 'Ç' : 'S', '¿' : 'E'
}

var MINMAJ = {
  'á' : 'Á', 'â' : 'Â', 'à' : 'À', 'Ä' : 'A', 'Â' : 'A', 'å' : 'Å', 'ã' : 'Ã',
  'é' : 'É', 'è' : 'È', 'ë' : 'Ë', 'ê' : 'Ê', 'æ' : 'Æ', 
  'ï' : 'Ï', 'î' : 'Î', 'ì' : 'Ì', 'í' : 'Í',
  'ô' : 'Ô', 'ö' : 'Ö', 'ò' : 'Ò', 'ó' : 'Ó','õ' : 'Õ', 'ø' : 'Ø', 'œ' : 'Œ',
  'ú' : 'Ú', 'ù' : 'Ù', 'û' : 'Û', 'ü' : 'Ü','ç' : 'Ç', 'ñ' : 'Ñ', 'ß' : 'S'
}

var replaceNumber = function(str){
  return str.replace(/[0-9]+/g, function($1){ return number2letter(parseInt($1)); })
}

var replaceChars = function(str, map){
  var tmp = [];
  for (var i = 0; i < str.length; i++)
    tmp.push( map[str[i]] || str[i] );
  return tmp.join('');
}

var replaceStrs = function(str, map){
  for (var key in map){
    str = str.replace(key, map[key])
  }
  return str;
}

var soundex = exports.soundex = function(str){
  if (!str) return '';
  return str.split(' ').map(soundexFR).join(' ');
}

var soundexFR = function(str){
  var soundex = str;                               // Selon votre implémentation, vous aurez besoin de décoder ce qui arrive pour les caractères spéciaux
      soundex = replaceNumber(soundex);            // ecrire les chiffre en toute lettre
      soundex = replaceChars(soundex, MINMAJ);     // minuscules accentuées ou composées en majuscules simples
      soundex = replaceChars(soundex, ACCENT);     // majuscules accentuées ou composées en majuscules simples
      soundex = soundex.toUpperCase();             // on passe tout le reste en majuscules
      soundex = soundex.replace(/[^A-Z]/g,'');     // on garde uniquement les lettres de A à Z
  
  var sBackup1 = soundex;                          // on sauve le code (utilisé pour les mots très courts)
  
  soundex = soundex.replace(/O[O]+/g, 'OU');       // pré traitement OO... -> OU
  soundex = soundex.replace(/SAOU/g, 'SOU');       // pré traitement SAOU -> SOU
  soundex = soundex.replace(/OES/g, 'OS');         // pré traitement OES -> OS
  soundex = soundex.replace(/CCH/g, 'K');          // pré traitement CCH -> K
  soundex = soundex.replace(/CC([IYE])/g, 'KS$1'); // CCI CCY CCE
  soundex = soundex.replace(/(.)\1/g, '$1');       // supression des répétitions
  
  // Special case
  switch(soundex){
    case "CD":    return soundex;
    case "BD":    return soundex;
    case "BV":    return soundex;
    case "TABAC": return "TABA";
    case "FEU":   return "FE";
    case "FE":    return soundex;
    case "FER":   return soundex;
    case "FIEF":  return soundex;
    case "FJORD": return soundex;
    case "GOAL":  return "GOL";
    case "FLEAU": return "FLEO";
    case "HIER":  return "IER";
    case "HEU":   return "E";
    case "HE":    return "E";
    case "OS":    return soundex;
    case "RIZ":   return "RI";
    case "RAZ":   return "RA";
  }
  
  // Pre Batch
  soundex = soundex.replace(/OIN[GT]$/g, 'OIN');                                 // terminaisons OING -> OIN
  soundex = soundex.replace(/E[RS]$/g, 'E');                                     // supression des terminaisons infinitifs et participes pluriels
  soundex = soundex.replace(/(C|CH)OEU/g, 'KE');                                 // pré traitement OEU -> EU
  soundex = soundex.replace(/MOEU/g, 'ME');                                      // pré traitement OEU -> EU
  soundex = soundex.replace(/OE([UI]+)([BCDFGHJKLMNPQRSTVWXZ])/g, 'E$1$2');      // pré traitement OEU OEI -> E
  soundex = soundex.replace(/^GEN[TS]$/g, 'JAN');                                // pré traitement GEN -> JAN
  soundex = soundex.replace(/CUEI/g, 'KEI');                                     // pré traitement accueil
  soundex = soundex.replace(/([^AEIOUYC])AE([BCDFGHJKLMNPQRSTVWXZ])/g, '$1E$2'); // pré traitement AE -> E
  soundex = soundex.replace(/AE([QS])/g, 'E$1');                                 // pré traitement AE -> E
  soundex = soundex.replace(/AIE([BCDFGJKLMNPQRSTVWXZ])/g, 'AI$1');              // pré-traitement AIE(consonne) -> AI
  soundex = soundex.replace(/ANIEM/g, 'ANIM');                                   // pré traitement NIEM -> NIM
  soundex = soundex.replace(/(DRA|TRO|IRO)P$/g, '$1');                           // P terminal muet
  soundex = soundex.replace(/(LOM)B$/g, '$1');                                   // B terminal muet
  soundex = soundex.replace(/(RON|POR)C$/g, '$1');                               // C terminal muet
  soundex = soundex.replace(/PECT$/g, 'PET');                                    // C terminal muet
  soundex = soundex.replace(/ECUL$/g, 'CU');                                     // L terminal muet
  soundex = soundex.replace(/(CHA|CA|E)M(P|PS)$/g, '$1N');                       // P ou PS terminal muet
  soundex = soundex.replace(/(TAN|RAN)G$/g, '$1');                               // G terminal muet
  
  // Sons YEUX
  var CONV_YEUX = {
   "DILAI" : "DIAI",  "DILON" : "DION", "DILER" : "DIER",  "DILEM" : "DIEM", "RILON" : "RION", "TAILE" : "TAIE", 
   "GAILET": "GAIET", "AILAI" : "AIAI", "AILAR" : "AIAR",  "OUILA" : "OUIA", "EILAI" : "AIAI", "EILAR" : "AIAR",
   "EILER" : "AIER",  "EILEM" : "AIEM", "REILET": "RAIET", "EILET" : "EIET", "AILOL" : "AIOL"
  }
  soundex = soundex.replace(/([^VO])ILAG/g, '$1IAJ');
  soundex = soundex.replace(/([^TRH])UIL(AR|E)(.+)/g, '$1UI$2$3');
  soundex = soundex.replace(/([G])UIL([AEO])/g, '$1UI$2');
  soundex = soundex.replace(/([NSPM])AIL([AEO])/g, '$1AI$2');
  soundex = replaceStrs(soundex, CONV_YEUX);
  soundex = soundex.replace(/([^AEIOUY])(SC|S)IEM([EA])/g, '$1$2IAM$3');   // IEM -> IAM
  soundex = soundex.replace(/^(SC|S)IEM([EA])/g, '$1IAM$2');               // IEM -> IAM
  
  // MP MB -> NP NB
  var CONV_MPMB = {
    'OMB': 'ONB', 'AMB': 'ANB', 'OMP': 'ONP', 'AMP': 'ANP', 'IMB': 'INB',
    'EMP': 'ANP', 'GEMB': 'JANB', 'EMB': 'ANB', 'UMBL': 'INBL', 'CIEN': 'SIAN' 
  }
  soundex = replaceStrs(soundex, CONV_MPMB);
  
  // Sons en K
  soundex = soundex.replace(/^ECHO$/g, 'EKO');     // cas particulier écho
  soundex = soundex.replace(/^ECEUR/g, 'EKEUR');   // cas particulier écœuré
  
  // Choléra Chœur mais pas chocolat!
    var CONV_CHO = {
    'EUCHA': 'EKA', 'YCHIA': 'IKIA', 'YCHA': 'IKA', 'YCHO': 'IKO', 'YCHED': 'IKED','ACHEO': 'AKEO',   
    'RCHEO': 'RKEO', 'RCHES': 'RKES', 'ECHN': 'EKN', 'OCHTO': 'OKTO', 'CHORA': 'KORA', 'CHONDR': 'KONDR',  
    'CHORE': 'KORE', 'MACHM': 'MAKM',  'BRONCHO':'BRONKO', 'LICHOS': 'LIKOS', 'LICHOC': 'LIKOC'   
  }
  soundex = soundex.replace(/^CH(OG+|OL+|OR+|EU+|ARIS|M+|IRO|ONDR)/g, 'K$1');        //En début de mot
  soundex = soundex.replace(/(YN|RI)CH(OG+|OL+|OC+|OP+|OM+|ARIS|M+|IRO|ONDR)/g, '$1K$2');  //Ou devant une consonne
  soundex = soundex.replace(/CHS/g, 'CH');
  soundex = soundex.replace(/CH(AIQ)/g, 'K$1');
  soundex = soundex.replace(/^ECHO([^UIPY])/g, 'EKO$1');
  soundex = soundex.replace(/ISCH(I|E)/g, 'ISK$1');
  soundex = soundex.replace(/^ICHT/g, 'IKT');
  soundex = soundex.replace(/ORCHID/g, 'ORKID');
  soundex = soundex.replace(/ONCHIO/g, 'ONKIO');
  soundex = soundex.replace(/ACHIA/g, 'AKIA');     // retouche ACHIA -> AKIA
  soundex = soundex.replace(/([^C])ANICH/g, '$1ANIK'); // ANICH -> ANIK  1/2
  soundex = soundex.replace(/OMANIK/g, 'OMANICH');   // cas particulier  2/2
  soundex = soundex.replace(/ACHY([^D])/g, 'AKI$1');
  soundex = soundex.replace(/([AEIOU])C([BDFGJKLMNPQRTVWXZ])/g, '$1K$2'); // voyelle, C, consonne sauf H
  soundex = replaceStrs(soundex, CONV_CHO);
  
  // Weuh (perfectible)
  var CONV_WHEU = { 'WA':'OI', 'WO':'O', 'WI':'OUI', 'WHI':'OUI', 'WHY':'OUI', 'WHA':'OUA', 'WHO':'OU' }
  soundex = replaceStrs(soundex, CONV_WHEU);
  
  // Gueu, Gneu, Jeu et quelques autres
  var CONV_GUEU = {
    'GNES':'NIES', 'GNET':'NIET', 'GNER':'NIER', 'GNE':'NE', 'GI':'JI', 'GNI':'NI', 'GNA':'NIA', 'GNOU':'NIOU','GNUR':'NIUR',
    'GY':'JI', 'OUGAIN':'OUGIN', 'AGEOL':'AJOL', 'AGEOT':'AJOT', 'GEOLO':'JEOLO', 'GEOM':'JEOM', 'GEOP':'JEOP', 'GEOG':'JEOG',
    'GEOS':'JEOS', 'GEORG':'JORJ', 'GEOR':'JEOR', 'NGEOT':'NJOT', 'UGEOT':'UJOT', 'GEOT':'JEOT', 'GEOD':'JEOD', 'GEOC':'JEOC',
    'GEO':'JO', 'GEA':'JA', 'GE':'JE', 'QU':'K', 'Q':'K', 'CY':'SI', 'CI':'SI', 'CN':'KN', 'ICM':'IKM', 'CEAT':'SAT', 'CE':'SE',
    'CR':'KR', 'CO':'KO', 'CUEI':'KEI', 'CU':'KU', 'VENCA':'VANSA', 'CA':'KA', 'CS':'KS', 'CLEN':'KLAN', 'CL':'KL', 'CZ':'KZ',
    'CTIQ':'KTIK', 'CTIF':'KTIF', 'CTIC':'KTIS', 'CTIS':'KTIS', 'CTIL':'KTIL', 'CTIO':'KSIO', 'CTI':'KTI', 'CTU':'KTU', 'CTE':'KTE',
    'CTO':'KTO', 'CTR':'KTR', 'CT':'KT', 'PH':'F', 'TH':'T', 'OW':'OU', 'LH':'L', 'RDL':'RL', 'CHLO':'KLO', 'CHR':'KR', 'PTIA':'PSIA'
  }
  soundex = replaceStrs(soundex, CONV_GUEU);
  soundex = soundex.replace(/GU([^RLMBSTPZN])/g, 'G$1'); // Gueu !
  soundex = soundex.replace(/GNO([MLTNRKG])/g, 'NIO$1'); // GNO ! Tout sauf S pour gnos
  soundex = soundex.replace(/GNO([MLTNRKG])/g, 'NIO$1'); // bis -> gnognotte! Si quelqu'un sait le faire en une seule regexp...
  
  // TI -> SI v2.0
  var CONV_TISI = {
    'BUTIE':'BUSIE', 'BUTIA':'BUSIA', 'BATIA':'BASIA', 'ANTIEL':'ANSIEL', 'RETION':'RESION', 'ENTIEL':'ENSIEL', 'ENTIAL':'ENSIAL',
    'ENTIO':'ENSIO', 'ENTIAI':'ENSIAI', 'UJETION':'UJESION', 'ATIEM':'ASIAM', 'PETIEN':'PESIEN', 'CETIE':'CESIE', 'OFETIE':'OFESIE',
    'IPETI':'IPESI', 'LBUTION':'LBUSION', 'BLUTION':'BLUSION', 'LETION':'LESION', 'LATION':'LASION', 'SATIET':'SASIET'
  }
  soundex = replaceStrs(soundex, CONV_TISI);
  soundex = soundex.replace(/(.+)ANTI(AL|O)/g,  '$1ANSI$2');  // sauf antialcoolique, antialbumine, antialarmer, ...
  soundex = soundex.replace(/(.+)INUTI([^V])/g, '$1INUSI$2'); // sauf inutilité, inutilement, diminutive, ...
  soundex = soundex.replace(/([^O])UTIEN/g,     '$1USIEN');   // sauf soutien, ...
  soundex = soundex.replace(/([^DE])RATI[E]$/g, '$1RASI$2');  // sauf xxxxxcratique, ...
  
  // TIEN TION -> SIEN SION v3.1
  soundex = soundex.replace(/([^SNEU]|KU|KO|RU|LU|BU|TU|AU)T(IEN|ION)/g, '$1S$2');
  
  // H muet
  soundex = soundex.replace(/([^CS])H/g, '$1'); // H muet
  soundex = soundex.replace( "ESH", "ES");      // H muet
  soundex = soundex.replace( "NSH", "NS");      // H muet
  soundex = soundex.replace( "SH", "CH");       // ou pas!
  
  var CONV_NASALES = {
    'OMT':'ONT','IMB':'INB','IMP':'INP','UMD':'OND','TIENT':'TIANT','RIENT':'RIANT','DIENT':'DIANT',
    'IEN':'IN','YMU':'IMU','YMO':'IMO','YMA':'IMA','YME':'IME','YMI':'IMI','YMN':'IMN','YM':'IN',
    'AHO':'AO','FAIM':'FIN','DAIM':'DIN','SAIM':'SIN','EIN':'AIN','AINS':'INS'
  }
  soundex = replaceStrs(soundex, CONV_NASALES);
  
  // AIN -> IN v2.0
  soundex = soundex.replace(/AIN$/g, 'IN');
  soundex = soundex.replace(/AIN([BTDK])/g, 'IN$1');
  // UN -> IN
  soundex = soundex.replace(/([^O])UND/g, '$1IND'); // aucun mot français ne commence par UND!
  soundex = soundex.replace(/([JTVLFMRPSBD])UN([^IAE])/g, '$1IN$2');
  soundex = soundex.replace(/([JTVLFMRPSBD])UN$/g, '$1IN');
  soundex = soundex.replace(/RFUM$/g, 'RFIN');
  soundex = soundex.replace(/LUMB/g, 'LINB');
  // EN -> AN
  soundex = soundex.replace(/([^BCDFGHJKLMNPQRSTVWXZ])EN/g, '$1AN');
  soundex = soundex.replace(/([VTLJMRPDSBFKNG])EN([BRCTDKZSVN])/g, '$1AN$2'); // deux fois pour les motifs recouvrants malentendu, pendentif, ...
  soundex = soundex.replace(/([VTLJMRPDSBFKNG])EN([BRCTDKZSVN])/g, '$1AN$2'); // si quelqu'un sait faire avec une seule regexp!
  soundex = soundex.replace(/^EN([BCDFGHJKLNPQRSTVXZ]|CH|IV|ORG|OB|UI|UA|UY)/g, 'AN$1');
  soundex = soundex.replace(/(^[JRVTH])EN([DRTFGSVJMP])/g, '$1AN$2');
  soundex = soundex.replace(/SEN([ST])/g, 'SAN$1');
  soundex = soundex.replace(/^DESENIV/g, 'DESANIV');
  soundex = soundex.replace(/([^M])EN(UI)/g, '$1AN$2');
  soundex = soundex.replace(/(.+[JTVLFMRPSBD])EN([JLFDSTG])/g, '$1AN$2');
  // EI -> AI
  soundex = soundex.replace(/([VSBSTNRLPM])E[IY]([ACDFRJLGZ])/g, '$1AI$2');
  
  // Histoire d'Ô
  var CONV_O = { 'EAU':'O', 'EU':'E', 'Y':'I', 'EOI':'OI', 'JEA':'JA', 'OIEM':'OIM', 'OUANJ':'OUENJ', 'OUA':'OI', 'OUENJ':'OUANJ' }
  soundex = replaceStrs(soundex, CONV_O);
  soundex = soundex.replace(/AU([^E])/g, 'O$1'); // AU sans E qui suit
  
  // Les retouches!
  soundex = soundex.replace(/^BENJ/g, 'BINJ');            // retouche BENJ -> BINJ
  soundex = soundex.replace(/RTIEL/g, 'RSIEL');           // retouche RTIEL -> RSIEL
  soundex = soundex.replace(/PINK/g, 'PONK');             // retouche PINK -> PONK
  soundex = soundex.replace(/KIND/g, 'KOND');             // retouche KIND -> KOND
  soundex = soundex.replace(/KUM(N|P)/g, 'KON$1');        // retouche KUMN KUMP
  soundex = soundex.replace(/LKOU/g, 'LKO');              // retouche LKOU -> LKO
  soundex = soundex.replace(/EDBE/g, 'EBE');              // retouche EDBE pied-bœuf
  soundex = soundex.replace(/ARCM/g, 'ARKM');             // retouche SCH -> CH
  soundex = soundex.replace(/SCH/g, 'CH');                // retouche SCH -> CH
  soundex = soundex.replace(/^OINI/g, 'ONI');             // retouche début OINI -> ONI
  soundex = soundex.replace(/([^NDCGRHKO])APT/g, '$1AT'); // retouche APT -> AT
  soundex = soundex.replace(/([L]|KON)PT/g, '$1T');       // retouche LPT -> LT
  soundex = soundex.replace(/OTB/g, 'OB');                // retouche OTB -> OB (hautbois)
  soundex = soundex.replace(/IXA/g, 'ISA');               // retouche IXA -> ISA
  soundex = soundex.replace(/TG/g, 'G');                  // retouche TG -> G
  soundex = soundex.replace(/^TZ/g, 'TS');                // retouche début TZ -> TS
  soundex = soundex.replace(/PTIE/g, 'TIE');              // retouche PTIE -> TIE
  soundex = soundex.replace(/GT/g, 'T');                  // retouche GT -> T
  soundex = soundex.replace("ANKIEM", "ANKILEM");         // retouche tranquillement
  soundex = soundex.replace(/(LO|RE)KEMAN/g, "$1KAMAN");  // KEMAN -> KAMAN
  soundex = soundex.replace(/NT(B|M)/g, 'N$1');           // retouche TB -> B  TM -> M
  soundex = soundex.replace(/GSU/g, 'SU');                // retouche GS -> SU
  soundex = soundex.replace(/ESD/g, 'ED');                // retouche ESD -> ED
  soundex = soundex.replace(/LESKEL/g,'LEKEL');           // retouche LESQUEL -> LEKEL
  soundex = soundex.replace(/CK/g, 'K');                  // retouche CK -> K
  
  // Terminaisons
  soundex = soundex.replace(/USIL$/g, 'USI');             // terminaisons USIL -> USI
  soundex = soundex.replace(/X$|[TD]S$|[DS]$/g, '');      // terminaisons TS DS LS X T D S...  v2.0
  soundex = soundex.replace(/([^KL]+)T$/g, '$1');         // sauf KT LT terminal
  soundex = soundex.replace(/^[H]/g, '');                 // H pseudo muet en début de mot, je sais, ce n'est pas une terminaison
  
  var sBackup2 = soundex;                                 // on sauve le code (utilisé pour les mots très courts)
  
  soundex = soundex.replace(/TIL$/g, 'TI');               // terminaisons TIL -> TI
  soundex = soundex.replace(/LC$/g, 'LK');                // terminaisons LC -> LK
  soundex = soundex.replace(/L[E]?[S]?$/g, 'L');          // terminaisons LE LES -> L
  soundex = soundex.replace(/(.+)N[E]?[S]?$/g, '$1N');    // terminaisons NE NES -> N
  soundex = soundex.replace(/EZ$/g, 'E');                 // terminaisons EZ -> E
  soundex = soundex.replace(/OIG$/g, 'OI');               // terminaisons OIG -> OI
  soundex = soundex.replace(/OUP$/g, 'OU');               // terminaisons OUP -> OU
  soundex = soundex.replace(/([^R])OM$/g, '$1ON');        // terminaisons OM -> ON sauf ROM
  soundex = soundex.replace(/LOP$/g, 'LO');               // terminaisons LOP -> LO
  soundex = soundex.replace(/NTANP$/g, 'NTAN');           // terminaisons NTANP -> NTAN
  soundex = soundex.replace(/TUN$/g, 'TIN');              // terminaisons TUN -> TIN
  soundex = soundex.replace(/AU$/g, 'O');                 // terminaisons AU -> O
  soundex = soundex.replace(/EI$/g, 'AI');                // terminaisons EI -> AI
  soundex = soundex.replace(/R[DG]$/g, 'R');              // terminaisons RD RG -> R
  soundex = soundex.replace(/ANC$/g, 'AN');               // terminaisons ANC -> AN
  soundex = soundex.replace(/KROC$/g, 'KRO');             // terminaisons C muet de CROC, ESCROC
  soundex = soundex.replace(/HOUC$/g, 'HOU');             // terminaisons C muet de CAOUTCHOUC
  soundex = soundex.replace(/OMAC$/g, 'OMA');             // terminaisons C muet de ESTOMAC (mais pas HAMAC)
  soundex = soundex.replace(/([J])O([NU])[CG]$/g,'$1O$2');// terminaisons C et G muet de OUC ONC OUG
  soundex = soundex.replace(/([^GTR])([AO])NG$/g,'$1$2N');// terminaisons G muet ANG ONG sauf GANG GONG TANG TONG
  soundex = soundex.replace(/UC$/g, 'UK');                // terminaisons UC -> UK
  soundex = soundex.replace(/AING$/g, 'IN');              // terminaisons AING -> IN
  soundex = soundex.replace(/([EISOARN])C$/g, '$1K');     // terminaisons C -> K
  soundex = soundex.replace(/([ABD-MO-Z]+)[EH]+$/g, '$1');// terminaisons E ou H sauf pour C et N
  soundex = soundex.replace(/EN$/g, 'AN');                // terminaisons EN -> AN (difficile à faire avant sans avoir des soucis) Et encore, c'est pas top!
  soundex = soundex.replace(/(NJ)EN$/g, '$1AN');          // terminaisons EN -> AN
  soundex = soundex.replace(/^PAIEM/g, 'PAIM');           // PAIE -> PAI
  soundex = soundex.replace(/([^NTB])EF$/g, '\1');        // F muet en fin de mot
  soundex = soundex.replace(/(.)\1/g, '$1');              // supression des répétitions (suite à certains remplacements)
  
   // cas particuliers, bah au final, je n'en ai qu'un ici
  soundex = replaceStrs(soundex, {'FUEL' : 'FIOUL' });
  
  // Ce sera le seul code retourné à une seule lettre!
  if (soundex == 'O') return(soundex);
  
  // Seconde chance sur les mots courts qui ont souffert de la simplification
  if (soundex.length < 2){
    
    // Sigles ou abréviations
    if (sBackup1.match(/[BCDFGHJKLMNPQRSTVWXYZ][BCDFGHJKLMNPQRSTVWXYZ][BCDFGHJKLMNPQRSTVWXYZ][BCDFGHJKLMNPQRSTVWXYZ]*/g)) 
      return sBackup1;
      
    if (sBackup1.match(/[RFMLVSPJDF][AEIOU]/g)) {
      if (sBackup1.length == 3)
          return sBackup1.substring(0,2) // mots de trois lettres supposés simples
      if (sBackup1.length == 4)
          return sBackup1.substring(0,3) // mots de quatre lettres supposés simples
    }
    if (sBackup2.length > 1) return sBackup2;
  }
    
  return soundex.length > 1 ? soundex : '';
}


var unitTest = exports.unitTest = function(){
  var count=0, error=0;
  var db = require('./soundexTest.js').db;
  for (var key in db){ count++
    var value = soundex(key);
    if (value != db[key]){ error++ }
  }
  info('UnitTest', error, '/', count);
}
