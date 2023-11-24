import { JSDOM } from "jsdom";
import https from "node:https";

const MOZILLA_MAIN_URL = new URL("https://developer.mozilla.org/en-US/docs/Web/HTML/Element");
https.get(MOZILLA_MAIN_URL, (response) => {
  let data = "";
  response.on("data", (d) => (data += d));
  response.on("end", () => console.log(parseMainPage(new JSDOM(data).window.document)));
});

/**
 * @typedef TagMetadata
 * @property {string} name
 * @property {URL?} url
 * @property {string} description
 */

/**
 * @param {Document} document
 * @returns {TagMetadata[]}
 */
function parseMainPage(document) {
  /** @type {TagMetadata[]} */
  const output = [];
  const tbodies = document.querySelectorAll("table > tbody");

  for (const tbody of tbodies) {
    for (const tr of tbody.children) {
      const td = tr.children[0].querySelector(":is(a, code)");
      const href = td.getAttribute("href");
      const url = href ? new URL(href, MOZILLA_MAIN_URL.origin) : null;
      const description = tr.children[1].textContent;
      output.push({ name: td.textContent.slice(1, -1), url, description });
    }
  }

  return output;
}
