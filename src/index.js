import { JSDOM } from "jsdom";

const MOZILLA_MAIN_URL = new URL("https://developer.mozilla.org/en-US/docs/Web/HTML/Element");
const html = await (await fetch(MOZILLA_MAIN_URL)).text();
const tagsMetadata = parseMainPage(new JSDOM(html).window.document);
const tagsDataResult = await Promise.allSettled(tagsMetadata.map(parseTagPage));

for (const tagData of tagsDataResult) {
  switch (tagData.status) {
    case "fulfilled":
      process.stdout.write(JSON.stringify(tagData.value, null, 2) + "\n", "utf8");
      break;
    case "rejected":
      /** @type {string}  */
      let error;

      if (tagData.reason instanceof Error) {
        const { message, name, stack } = tagData.reason;
        error = JSON.stringify({ name: name, message: message, stack: stack }, null, 2);
      } else {
        error = tagData.reason.toString();
      }

      process.stderr.write(error + "\n", "utf8");
      break;
  }
}

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

/**
 * @typedef TagData
 * @property {string} name
 * @property {string} description
 * @property {string[]} attributes
 */

/**
 * @param {TagMetadata} metadata
 * @returns {Promise<TagData>}
 */
async function parseTagPage(metadata) {
  /** @type {TagData}  */
  const output = { name: metadata.name, description: metadata.description, attributes: [] };
  if (!metadata.url) Promise.resolve(output);

  const html = await (await fetch(metadata.url)).text();
  const document = new JSDOM(html).window.document;
  const dls = document.querySelectorAll("div > dl");

  for (const dl of dls) {
    for (const attribute of dl.getElementsByTagName("dt")) {
      output.attributes.push(attribute.textContent);
    }
  }

  return output;
}
