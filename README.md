# Welcome to the BibleBot :book:
The **BibleBot** sends scripture to any references in your messages. You can type any verse reference and the BibleBot will reply with a snippet of that verse and a link to longer verse text. Here are some examples:

:pray: Single Verse: John 3:16
:muscle: Consecutive Verses: Matthew 28:18-20
:clap: Non-Consecutive Verse: John 11:33,35
:blue_book: Entire Chapters: John 1
:fire: Book abbreviations: Phil 4:13
:raised_hands: Versions ASV or KJV: Phil 4:13 KJV

![BibleBot example interactions](https://raw.githubusercontent.com/andrewpottenger/BibleBot/master/examples/BibleBot-interaction.png)

### Supported `/bible` commands

With the a `/bible` slash command, you request any scripture.

- `/bible John 3:16` - Returns the reference verse and link

### Install

```shell
$ npm install
```

### Copy `.env-example` to `.env`

```shell
$ cp .env-example .env
```

### Configure

```shell
SLACK_BOT_TOKEN=xoxb...8WRqKWx
SLACK_SIGNING_SECRET=f345....6789
BIBLE_API_KEY=fbdasfsdsd.....asdcadsasd
BIBLE_VERSION=ASV
PORT=3000
```
### Run

```shell
$ npm start

📖 The BibleBot app is running! 📖
```

Visit [localhost:3000](http://localhost:3000).
