# Fandom Wiki Copy Bot

This bot copies and synchronizes pages from one Fandom wiki to another (or multiple), using Fandom's MediaWiki API. It supports custom page mappings per target and uses a secure bot password for authentication.

---

## Prerequisites

Before you can run the bot, install the following:

1. Install Node.js + npm

- Download and install Node.js (includes npm) from https://nodejs.org/
- To verify run:
  `node -v`
  `npm -v`

2. Install Git

- Download and install Git from https://git-scm.com/
- To verify:
  git --version

---

## Setup

1. Clone this repository `git clone https://github.com/jeremeriluoto/fandom-wiki-copy-bot.git`

2. Go to the created directory `cd fandom-wiki-copy-bot`

3. Install dependencies `npm install`

---

## Running the bot

`node main.js`

The script will:

- Fetch all pages from the source wiki
- Copy or update them to each configured target wiki
- Apply any custom title mappings if defined

---

## Configuration

All configuration is inside the `config` object in `fandom-sync.js`.

Example:

```
const config = {
    username: "YourUsername@BotName", // from Fandom bot password
    password: "your-bot-password-here",
    sourceWiki: "mygame.fandom.com",
    targetWikis: [
        {
            wiki: "mygame-fr.fandom.com/fr",
            authUrl: "https://mygame-fr.fandom.com/fr/api.php",
            slugMap: {
                "Main_Page": "Accueil",
                "Game_Guide": "Guide_du_Jeu"
            }
        },
        {
            wiki: "mygame-de.fandom.com/de",
            authUrl: "https://mygame-de.fandom.com/de/api.php",
            slugMap: {
                "Main_Page": "Startseite"
            }
        }
    ]
};
```

Field Explanation:

- username: Your Fandom username followed by "@BotName"
- password: The bot password you generate
- sourceWiki: The source wiki's domain (no language code in path)
- targetWikis[].wiki: The target wiki domain with language path (e.g. /fr)
- targetWikis[].authUrl: Full API login path (must include language code path)
- targetWikis[].slugMap: Optional dictionary of page slugs to rename during sync

---

## Creating a Bot Account

1. Go to: https://community.fandom.com/wiki/Special:BotPasswords

2. Create a new bot password:

   - Bot name: e.g. CopyBot
   - Grants:
     - Edit existing pages
     - Create, edit and move pages

3. After creating, you will get:

   - A username like: Mr.YourName@CopyBot
   - A secure bot password

4. Use those in the config:

username: "Mr.YourName@CopyBot"
password: "bot-password"

NOTE: NEVER SHARE THE PASSWORD AND BOT NAME TO ANYONE YOU DO NOT TRUST

---

## Tips

- Do not commit your bot credentials to a public repository.
- You can optionally move credentials into a `.env` file using the dotenv package.
- For safer testing, add a dry-run or logging mode before syncing live content.

---

## License

MIT — use freely.
