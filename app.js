const { App } = require("@slack/bolt");
const request = require('request');
const en_bcv_parser = require("./en_bcv_parser.js");
const parseQuery = require("./bibleQueryParser.js");
const bibleMap = require("./bibles.json");
const booksMap = require("./books.json");
const version = process.env.BIBLE_VERSION || 'ASV';
// Book Abbreviations - Taken from https://www.logos.com/bible-book-abbreviations
const bibleBookAbvRegEx = /\b(genesis|gen|ge|gn|exodus|exo|ex|exod|leviticus|lev|le|lv|numbers|num|nu|nm|nb|deuteronomy|deut|dt|joshua|josh|jos|jsh|judges|judg|jdg|jg|jdgs|ruth|rth|ru|1 samuel|1 sam|1 sa|1samuel|1s|i sa|1 sm|1sa|i sam|1sam|i samuel|1st samuel|first samuel|2 samuel|2 sam|2 sa|2s|ii sa|2 sm|2sa|ii sam|2sam|ii samuel|2samuel|2nd samuel|second samuel|1 kings|1 kgs|1 ki|1k|i kgs|1kgs|i ki|1ki|i kings|1kings|1st kgs|1st kings|first kings|first kgs|1kin|2 kings|2 kgs|2 ki|2k|ii kgs|2kgs|ii ki|2ki|ii kings|2kings|2nd kgs|2nd kings|second kings|second kgs|2kin|1 chronicles|1 chron|1 ch|i ch|1ch|1 chr|i chr|1chr|i chron|1chron|i chronicles|1chronicles|1st chronicles|first chronicles|2 chronicles|2 chron|2 ch|ii ch|2ch|ii chr|2chr|ii chron|2chron|ii chronicles|2chronicles|2nd chronicles|second chronicles|ezra|ezra|ezr|nehemiah|neh|ne|esther|esth|es|job|jb|psalm|pslm|ps|psalms|psa|psm|pss|proverbs|prov|pr|prv|ecclesiastes|eccles|ec|ecc|qoh|qoheleth|song of solomon|song|so|canticle of canticles|canticles|song of songs|sos|isaiah|isa|is|jeremiah|jer|je|jr|lamentations|lam|la|ezekiel|ezek|eze|ezk|daniel|dan|da|dn|hosea|hos|ho|joel|joe|jl|amos|am|obadiah|obad|ob|jonah|jnh|jon|micah|mic|nahum|nah|na|habakkuk|hab|hab|zephaniah|zeph|zep|zp|haggai|hag|hg|zechariah|zech|zec|zc|malachi|mal|mal|ml|matthew|matt|mt|mark|mrk|mk|mr|luke|luk|lk|john|jn|jhn|acts|ac|romans|rom|ro|rm|1 corinthians|1 cor|1 co|i co|1co|i cor|1cor|i corinthians|1corinthians|1st corinthians|first corinthians|2 corinthians|2 cor|2 co|ii co|2co|ii cor|2cor|ii corinthians|2corinthians|2nd corinthians|second corinthians|galatians|gal|ga|ephesians|ephes|eph|philippians|phil|php|colossians|col|col|1 thessalonians|1 thess|1 th|i th|1th|i thes|1thes|i thess|1thess|i thessalonians|1thessalonians|1st thessalonians|first thessalonians|2 thessalonians|2 thess|2 th|ii th|2th|ii thes|2thes|ii thess|2thess|ii thessalonians|2thessalonians|2nd thessalonians|second thessalonians|1 timothy|1 tim|1 ti|i ti|1ti|i tim|1tim|i timothy|1timothy|1st timothy|first timothy|2 timothy|2 tim|2 ti|ii ti|2ti|ii tim|2tim|ii timothy|2timothy|2nd timothy|second timothy|titus|tit|philemon|philem|phm|hebrews|heb|james|jas|jm|1 peter|1 pet|1 pe|i pe|1pe|i pet|1pet|i pt|1 pt|1pt|i peter|1peter|1st peter|first peter|2 peter|2 pet|2 pe|ii pe|2pe|ii pet|2pet|ii pt|2 pt|2pt|ii peter|2peter|2nd peter|second peter|1 john|1 jn|i jn|1jn|i jo|1jo|i joh|1joh|i jhn|1 jhn|1jhn|i john|1john|1st john|first john|2 john|2 jn|ii jn|2jn|ii jo|2jo|ii joh|2joh|ii jhn|2 jhn|2jhn|ii john|2john|2nd john|second john|3 john|3 jn|iii jn|3jn|iii jo|3jo|iii joh|3joh|iii jhn|3 jhn|3jhn|iii john|3john|3rd john|third john|jude|jud|revelation|rev|re|the revelation)\b/i;

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// return Bible version ID for API call
const getBibleVersionId = function() {
  const bibleVersionId = (bibleMap[version] && bibleMap[version].id) ? bibleMap[version].id : new Error('This version is not supported');
  return bibleVersionId;
}

// Bible verseion abbreviation
const getBibleVersionAbv = function() {
  const bibleVersionAbv = (bibleMap[version] && bibleMap[version].abbreviationLocal) ? bibleMap[version].abbreviationLocal : new Error('This version is not supported');
  return bibleVersionAbv;
}

// Biblegateway Link e.g. https://www.biblegateway.com/passage/?search=john.1.16&version=ASV
const getReferenceLink = function(verse) {
  return `https://biblegateway.com/bible?passage=${verse}&version=${version}`;
}

// OSIS Verse Reference
// Parser repo: https://github.com/openbibleinfo/Bible-Passage-Reference-Parser
// Parser demo: https://www.openbible.info/labs/reference-parser/
// verse formats supported:
// - osis: "John.1"
// - osis: "John.1.1"
// - osis: "John.1.1-John.1.2"
// - osis: "John.1.1,John.1.3"
const getVerseRef = function(message) {
  if (!message) return;
  let verseRef;
  const result = parseQuery(message.text);
  if (!result || !result.components) return;
  const verseList = result.components.filter(function(component) {
    return component.type === 'osis';
  });

  if (verseList.length > 1 ){
    var multiVerseRef = [];
    verseList.forEach(function(verse) {
      multiVerseRef.push(verse.osis);
    });
    verseRef = multiVerseRef.join(',');
  } else {
    verseRef = verseList[0] && verseList[0].osis;
  }

  if (!verseRef) return;
  return verseRef;
}

// return an array from a single verse reference e.g. John.1.1 -> [John, 1, 1]
const getVerseArray = function(verseRef) {
  const verseArr = verseRef && verseRef.split('.');

  // check for a full verse reference
  if (!verseArr || !verseArr[0]) return;
  return verseArr;
}

// formats a single verse key to map to API keys
const formatVerseForAPI = function(singleVerse) {
  const verseArr = getVerseArray(singleVerse);
  // prepare API for call based on input, always show the first verse, , provide link to full scripture
  // 1: ... book (chapter 1)
  // 2: ... book chapter (1)
  // 3: book chapter:verse
  if (verseArr.length === 1) {
    verseArr.push('1'); // push chapter
    verseArr.push('1'); // push verse
  } else if (verseArr.length === 2) {
    verseArr.push('1'); // push verse
  }

  if (!verseArr) return;
  const book = verseArr[0];

  // get bookID to replace osis book key to the bookID defined by api.scripture.api.bible
  const bookId = booksMap[book] && booksMap[book].bookId;
  if (!bookId) return;
  const formattedVerseRef = verseArr.join('.').replace(book, bookId);
  return formattedVerseRef;
}

// formate single verse reference e.g. John1.1 -> John 1:1
const formatSingleVerseForLink = function(singleVerseRef) {
  const verseArr = getVerseArray(singleVerseRef);
  const book = booksMap[verseArr[0]] && booksMap[verseArr[0]].name ? booksMap[verseArr[0]].name : null;
  // required is at least a bible book
  if (!book) return;

  // not required, a chapter
  const chapter = verseArr[1] ? verseArr[1] : '';

  // not required, a verse
  const colon = verseArr[2] ? ':' : '' ;
  const verse = verseArr[2] ? verseArr[2] : '' ;

  return `${book} ${chapter}${colon}${verse}`;
}

// handle multi verse and single verse references
// verse formats supported:
// osis: "John.1" -> [John.1]
// osis: "John.1.1" -> [John.1.1]
// osis: "John.1.1-John.1.2" -> [John.1.1, John.1.2]
// osis: "John.1.1,John.1.3" -> [John.1.1, John.1.3]
const getVersesArray = function(verseRef) {
  let verseArr = [];

  if (verseRef.indexOf('-') !== -1) {
    verseArr = verseRef && verseRef.split('-');
  } else if (verseRef.indexOf(',') !== -1) {
    verseArr = verseRef && verseRef.split(',');
  } else {
    verseArr.push(verseRef);
  }

  return verseArr;
}

// format verse reference for link
const getDisplayVerse = function(verseRef) {
  const verseAbv = getBibleVersionAbv();
  let displayText = '';
  const verseArr = getVersesArray(verseRef);

  if (verseArr.length > 1) {
    var displayArr = [];
    verseArr.forEach(function(verse) {
      displayArr.push(formatSingleVerseForLink(verse));
    });

    if (verseRef.indexOf('-') !== -1) {
      displayText = displayArr.join('-');
    } else if (verseRef.indexOf(',') !== -1) {
      displayText = displayArr.join(',');
    }

  } else {
    displayText = formatSingleVerseForLink(verseArr[0]);
  }
  return  `${displayText} (${verseAbv})`;
}

// request verse from API, respond with a verse with a reference link
const getVerse = function(message, say) {
  const versionId = getBibleVersionId();
  const verseRef = getVerseRef(message);
  if (!verseRef) return
  const verseArr = getVersesArray(verseRef);

  const singleVerseRef = verseArr[0];
  if (!singleVerseRef) return;

  // formats a single verse key to map to API keys
  const verseForAPI = formatVerseForAPI(singleVerseRef);
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
      const verse = rawVerseContent.trim();
      const verseEnd = (verseRef.split('.').length < 3 || verseArr.length > 1) ? '...\n :book: ' : '\n:book: ';

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
