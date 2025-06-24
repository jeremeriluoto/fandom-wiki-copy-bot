import axios from "axios";

const config = {
  username: "YourUsername@BotName", // from Fandom bot password
  password: "your-bot-password-here",
  sourceWiki: "mygame.fandom.com",
  targetWikis: [
    {
      wiki: "mygame-fr.fandom.com/fr",
      authUrl: "https://mygame-fr.fandom.com/fr/api.php",
      slugMap: {
        Main_Page: "Accueil",
        Game_Guide: "Guide_du_Jeu",
      },
    },
    {
      wiki: "mygame-de.fandom.com/de",
      authUrl: "https://mygame-de.fandom.com/de/api.php",
      slugMap: {
        Main_Page: "Startseite",
      },
    },
  ],
};

// Utilities
const getApiUrl = (wiki) => `https://${wiki}/api.php`;

const apiGet = async (apiUrl, params, cookies = []) => {
  const res = await axios.get(apiUrl, {
    params: { format: "json", ...params },
    headers: cookies.length ? { Cookie: cookies.join("; ") } : {},
  });
  return { data: res.data, cookies: res.headers["set-cookie"] || [] };
};

const apiPost = async (apiUrl, params, cookies) => {
  const res = await axios.post(
    apiUrl,
    new URLSearchParams({ format: "json", ...params }),
    {
      headers: {
        Cookie: cookies.join("; "),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  return { data: res.data, cookies: res.headers["set-cookie"] || [] };
};

const normalize = (str) => str?.replace(/\r\n/g, "\n").trim();

// Auth
async function login(authUrl) {
  const { data: tokenData, cookies: loginCookies } = await apiGet(authUrl, {
    action: "query",
    meta: "tokens",
    type: "login",
  });

  const loginToken = tokenData.query.tokens.logintoken;

  const { data: loginRes, cookies: sessionCookies } = await apiPost(
    authUrl,
    {
      action: "login",
      lgname: config.username,
      lgpassword: config.password,
      lgtoken: loginToken,
    },
    loginCookies
  );

  const fullCookies = [...loginCookies, ...sessionCookies];
  if (loginRes.login.result !== "Success") {
    console.error(`[DEBUG] Login failure for ${authUrl}:`, loginRes.login);
    throw new Error(`Login failed for ${authUrl}`);
  }

  return fullCookies;
}

// Page logic
async function getPageContent(wiki, title) {
  const apiUrl = getApiUrl(wiki);
  try {
    const { data } = await apiGet(apiUrl, {
      action: "query",
      prop: "revisions",
      rvprop: "content",
      titles: title,
      formatversion: 2,
    });
    const page = data.query.pages?.[0];
    if (page?.missing === true) return null;
    return page?.revisions?.[0]?.content || "";
  } catch (err) {
    console.error(
      `[ERR] Failed to get "${title}" from ${wiki}: ${err.message}`
    );
    return null;
  }
}

async function getAllPages(wiki) {
  const apiUrl = getApiUrl(wiki);
  let titles = [];
  let apcontinue;
  do {
    const { data } = await apiGet(apiUrl, {
      action: "query",
      list: "allpages",
      aplimit: "max",
      ...(apcontinue ? { apcontinue } : {}),
    });
    const pages = data.query.allpages.map((p) => p.title);
    titles.push(...pages);
    apcontinue = data.continue?.apcontinue;
  } while (apcontinue);
  return titles;
}

async function getCsrfToken(apiUrl, cookies) {
  const { data } = await apiGet(
    apiUrl,
    { action: "query", meta: "tokens" },
    cookies
  );
  return data.query.tokens.csrftoken;
}

async function editPage(apiUrl, title, content, cookies, csrfToken) {
  const { data } = await apiPost(
    apiUrl,
    {
      action: "edit",
      title,
      text: content,
      summary: "Synced from EN wiki",
      token: csrfToken,
    },
    cookies
  );

  if (data?.edit?.result === "Success") {
    console.log(`[✓] Synced "${title}"`);
  } else {
    console.warn(`[✗] Failed to sync "${title}"`, data?.error || data?.edit);
  }
}

function toSlug(title) {
  return title.trim().replace(/ /g, "_");
}

async function syncPageToTargets(sourceTitle, sourceContent) {
  const sourceSlug = toSlug(sourceTitle);

  for (const target of config.targetWikis) {
    const { wiki, authUrl, slugMap } = target;
    const targetSlug = slugMap?.[sourceSlug] || sourceSlug;

    try {
      const current = await getPageContent(wiki, targetSlug);
      const cookies = await login(authUrl);
      const token = await getCsrfToken(getApiUrl(wiki), cookies);

      if (current === null) {
        console.log(`[+] Creating "${targetSlug}" on ${wiki}`);
        await editPage(
          getApiUrl(wiki),
          targetSlug,
          sourceContent,
          cookies,
          token
        );
      } else if (normalize(current) === normalize(sourceContent)) {
        console.log(`[=] ${wiki} "${targetSlug}" is up to date.`);
      } else {
        console.log(`[~] Updating "${targetSlug}" on ${wiki}`);
        await editPage(
          getApiUrl(wiki),
          targetSlug,
          sourceContent,
          cookies,
          token
        );
      }
    } catch (err) {
      console.error(`[ERR] ${wiki} "${targetSlug}": ${err.message}`);
    }
  }
}

async function main() {
  const allPages = await getAllPages(config.sourceWiki);
  console.log(`Discovered ${allPages.length} pages in ${config.sourceWiki}`);

  for (const title of allPages) {
    try {
      const sourceContent = await getPageContent(config.sourceWiki, title);
      await syncPageToTargets(title, sourceContent);
    } catch (err) {
      console.error(`[ERR] Source fetch failed for "${title}": ${err.message}`);
    }
  }
}

main().catch(console.error);
