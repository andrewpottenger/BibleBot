const { App } = require("@slack/bolt");
const request = require('request');
const en_bcv_parser = require("./en_bcv_parser.js");
const parseQuery = require("./bibleQueryParser.js");
const bibleMap = require("./bibles.json");
const booksMap = require("./books.json");
const version = process.env.BIBLE_VERSION || 'ASV';
// Book Abbreviations - Taken from https://www.logos.com/bible-book-abbreviations
const bibleBookAbvRegEx = /\b(1 ch|1 chr|1 chron|1 chronicles|1 co|1 cor|1 corinthians|1 esd|1 esdr|1 esdras|1 jhn|1 jn|1 john|1 kgs|1 ki|1 kings|1 mac|1 macc|1 maccabees|1 pe|1 pet|1 peter|1 pt|1 sa|1 sam|1 samuel|1 sm|1 th|1 thess|1 thessalonians|1 ti|1 tim|1 timothy|1ch|1chr|1chron|1chronicles|1co|1cor|1corinthians|1es|1esd|1esdr|1esdras|1jhn|1jn|1jo|1joh|1john|1k|1kgs|1ki|1kin|1kings|1m|1ma|1mac|1macc|1maccabees|1pe|1pet|1peter|1pt|1s|1sa|1sam|1samuel|1st chronicles|1st corinthians|1st esdras|1st john|1st kgs|1st kings|1st maccabees|1st peter|1st samuel|1st thessalonians|1st timothy|1th|1thes|1thess|1thessalonians|1ti|1tim|1timothy|2 ch|2 chron|2 chronicles|2 co|2 cor|2 corinthians|2 esd|2 esdr|2 esdras|2 jhn|2 jn|2 john|2 kgs|2 ki|2 kings|2 mac|2 macc|2 maccabees|2 pe|2 pet|2 peter|2 pt|2 sa|2 sam|2 samuel|2 sm|2 th|2 thess|2 thessalonians|2 ti|2 tim|2 timothy|2ch|2chr|2chron|2chronicles|2co|2cor|2corinthians|2es|2esd|2esdr|2esdras|2jhn|2jn|2jo|2joh|2john|2k|2kgs|2ki|2kin|2kings|2m|2ma|2mac|2macc|2maccabees|2nd chronicles|2nd corinthians|2nd esdras|2nd john|2nd kgs|2nd kings|2nd maccabees|2nd peter|2nd samuel|2nd thessalonians|2nd timothy|2pe|2pet|2peter|2pt|2s|2sa|2sam|2samuel|2th|2thes|2thess|2thessalonians|2ti|2tim|2timothy|3 jhn|3 jn|3 john|3 mac|3 macc|3 maccabees|3jhn|3jn|3jo|3joh|3john|3ma|3mac|3macc|3rd john|3rd maccabees|4 mac|4 macc|4 maccabees|4ma|4mac|4macc|4maccabees|4th maccabees|ac|acts|add es|add esth|add ps|add psalm|addesth|additional psalm|additions to esther|aes|am|amos|azariah|bar|baruch|bel|bel and the dragon|canticle of canticles|canticles|col|colossians|da|dan|daniel|deut|deuteronomy|dn|dt|ec|ecc|eccles|ecclesiastes|ecclesiasticus|ecclus|ep laod|eph|ephes|ephesians|epist laodiceans|epistle laodiceans|epistle to laodiceans|epistle to the laodiceans|es|esth|esther|ex|exo|exod|exodus|eze|ezek|ezekiel|ezk|ezr|ezra|first chronicles|first corinthians|first esdras|first john|first kgs|first kings|first maccabees|first peter|first samuel|first thessalonians|first timothy|fourth maccabees|ga|gal|galatians|ge|gen|genesis|gn|hab|habakkuk|hag|haggai|heb|hebrews|hg|ho|hos|hosea|i ch|i chr|i chron|i chronicles|i co|i cor|i corinthians|i es|i esd|i esdr|i esdras|i jhn|i jn|i jo|i joh|i john|i kgs|i ki|i kings|i ma|i mac|i macc|i maccabees|i pe|i pet|i peter|i pt|i sa|i sam|i samuel|i th|i thes|i thess|i thessalonians|i ti|i tim|i timothy|ii ch|ii chr|ii chron|ii chronicles|ii co|ii cor|ii corinthians|ii es|ii esd|ii esdr|ii esdras|ii jhn|ii jn|ii jo|ii joh|ii john|ii kgs|ii ki|ii kings|ii ma|ii mac|ii macc|ii maccabees|ii pe|ii pet|ii peter|ii pt|ii sa|ii sam|ii samuel|ii th|ii thes|ii thess|ii thessalonians|ii ti|ii tim|ii timothy|iii jhn|iii jn|iii jo|iii joh|iii john|iii ma|iii mac|iii macc|iii maccabees|iiii maccabees|is|isa|isaiah|iv ma|iv mac|iv macc|iv maccabees|james|jas|jb|jdg|jdgs|jdt|jdth|je|jer|jeremiah|jg|jhn|jl|jm|jn|jnh|job|joe|joel|john|jon|jonah|jos|josh|joshua|jr|jsh|jth|jud|jude|judg|judges|judith|la|lam|lamentations|laod|laodiceans|le|let jer|letter of jeremiah|lev|leviticus|lje|lk|ltr jer|luk|luke|lv|mal|malachi|mark|matt|matthew|mic|micah|mk|ml|mr|mrk|mt|na|nah|nahum|nb|ne|neh|nehemiah|nm|nu|num|numbers|ob|obad|obadiah|ode|phil|philem|philemon|philippians|phm|php|pma|pr|pr az|pr man|pr of man|prayer of azariah|prayer of manasseh|prayer of manasses|prov|proverbs|prv|ps|ps sol|ps solomon|psa|psalm|psalms|psalms of solomon|psalms solomon|pslm|psm|pss|pssol|qoh|qoheleth|re|rest of esther|rev|revelation|rm|ro|rom|romans|rth|ru|ruth|second chronicles|second corinthians|second esdras|second john|second kgs|second kings|second maccabees|second peter|second samuel|second thessalonians|second timothy|sir|sirach|so|song|song of solomon|song of songs|song of the three holy children|song of thr|song of three|song of three children|song of three jews|song of three youths|song thr|sos|sus|susanna|tb|the rest of esther|the revelation|the song of the three holy children|the song of three jews|the song of three youths|third john|third maccabees|tit|titus|tob|tobit|wis|wisd of sol|wisdom|wisdom of solomon|ws|zc|zec|zech|zechariah|zep|zeph|zephaniah|zp)\b/i;

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

const getBibleVersionId = function() {
  const bibleVersionId = (bibleMap[version] && bibleMap[version].id) ? bibleMap[version].id : new Error('This version is not supported');
  return bibleVersionId;
}

const getBibleVersionAbv = function() {
  const bibleVersionAbv = (bibleMap[version] && bibleMap[version].abbreviationLocal) ? bibleMap[version].abbreviationLocal : new Error('This version is not supported');
  return bibleVersionAbv;
}

//link e.g. https://www.biblegateway.com/passage/?search=john.1.16&version=ASV
const getReferenceLink = function(verse) {
  return `https://biblegateway.com/bible?passage=${verse}&version=${version}`;
}

//osis: "John.3.1-John.3.2",
// osis: "John.3.1-John.3.4"
// osis: "John.3.1
// osis: John.3.4"

const getVerseRef = function(message) {
  if (!message) return;
  // parse reference https://github.com/openbibleinfo/Bible-Passage-Reference-Parser
  // osis verse reference parser demo https://www.openbible.info/labs/reference-parser/
  const result = parseQuery(message.text);
  if (!result || !result.components) return;
  const verseRefList = result.components.filter(function(component) {
    return component.type === 'osis';
  });
  const verseRef = verseRefList[0] && verseRefList[0].osis;
  if (!verseRef) return;
  return verseRef;
}

const getMultiVerseArray = function(verses) {
//   let verseArr = [];
//   if (verseRefs.length === 1) {
//     // TODO: support chapter or multi-verse reference
//   // split to ensure single verse instead of chapter or multi-verse reference, which is supported by osis but not the bot atm
//     verseArr = verseRef && verseRef.split('.');
//     // check for a full verse reference
//     if (!verseArr || !verseArr[0]) return;
//     return verseArr;
//   } else if (verseRefs.length > 1) {
//       verseRefs.join(',');
//   }
}

const getVerseArray = function(verseRef) {
  // TODO: support chapter or multi-verse reference
  // split to ensure single verse instead of chapter or multi-verse reference, which is supported by osis but not the bot atm
  const verseArr = verseRef && verseRef.split('.');

  // check for a full verse reference
  if (!verseArr || !verseArr[0]) return;
  return verseArr;
}

const getDisplayVerse = function(verseRef) {
  const verseArr = getVerseArray(verseRef);
  let prependText = '';
  let addVerse = ' ';

  // book chapter:verse 3
  // ... book chapter (1) 2
  // ... book (chapter 1) 1
  if (verseArr.length === 1) {
    //prependText = '... ';
  } else if (verseArr.length === 2) {
    //prependText = '... ';
  } else if (verseArr.length === 3) {
    addVerse = ':' + verseArr[2];
  }

  const book = booksMap[verseArr[0]] && booksMap[verseArr[0]].name;
  const verseAbv = getBibleVersionAbv();
  if (!book) return;
  return `${prependText}${book} ${verseArr[1]}${addVerse} (${verseAbv})`;
}

const formatVerseForAPI = function(verse) {
  const verseArr = getVerseArray(verse);
  // prepare API for call based on input, always show the first verse, , provide link to full scrpture
  // 1: ... book (chapter 1)
  // 2: ... book chapter (1)
  // 3: book chapter:verse
  if (verseArr.length === 1) {
    verseArr.push('1');
    verseArr.push('1');
  } else if (verseArr.length === 2) {
    verseArr.push('1');
  }

  if (!verseArr) return;
  const book = verseArr[0];

  // get bookID to replace osis book key to the bookID defined by api.scripture.api.bible
  const bookId = booksMap[book] && booksMap[book].bookId;
  if (!bookId) return;
  const formattedVerseRef = verse.replace(book, bookId);
  return formattedVerseRef;
}

const getVerse = function(message, say) {
  const versionId = getBibleVersionId();
  const verseRef = getVerseRef(message);
  if (!verseRef) return;
  // use the first verse for request to keep count low, provide link to full scrpture
  const verseForAPI = formatVerseForAPI(verseRef);
  const options = {
      url: `https://api.scripture.api.bible/v1/bibles/${versionId}/passages/${verseForAPI}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false&use-org-id=false`,
      method: 'GET',
      headers: {
          'api-key': process.env.BIBLE_API_KEY
      }
  };

  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      const results = JSON.parse(response.body);
      const rawVerseContent = results.data.content;
      if (!rawVerseContent) return;
      const verseContent = rawVerseContent.split(']');
      const verse = (verseContent.length > 1) ? verseContent[1].trim() : verseContent.trim();
      const verseEnd = (verseContent.length > 2) ? '] ... :book: ' : ' :book: ';

      if (verse) {
        const refLink = getReferenceLink(verseRef);
        const displayVerse = getDisplayVerse(verseRef);
        try {
          say({
            blocks: [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": `> ${verse}${verseEnd}<${refLink}|${displayVerse}>`
              },
            }
            ]
          });
        } catch (error) {
          if (error === 'not_in_channel') {
            try {
              say({
                blocks: [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "The BibleBot isn't added to this channel. Ask the admin to receive instant scripture references"
                  },
                }
                ]
              });
            } catch (error) {
              console.error(error);
            }
          }
          console.error(error);
        }
      }

    } else {
      if (error === 'not_in_channel') {
        try {
          say({
            blocks: [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": "The BibleBot isn't added to this channel. Ask the admin to receive instant scripture references"
              },
            }
            ]
          });
        } catch (error) {
          console.error(error);
        }
      }

      console.error(error);
    }
  });
}

app.message(bibleBookAbvRegEx, async ({ message, say }) => {
  getVerse(message, say);
});

app.command('/bible', async ({ command, ack, say }) => {
   // Acknowledge command request
  await ack();
  getVerse(command, say);
});

app.error((error) => {
  // Check the details of the error to handle cases where you should retry sending a message or stop the app
  console.error(error);
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();
