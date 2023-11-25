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
        error = JSON.stringify({ name, message, stack }, null, 2);
      } else {
        error = tagData.reason.toString();
      }

      process.stderr.write(error + "\n", "utf8");
      break;
  }
}

/**
 * @typedef TagMetadata
 * @property {string} tag
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
      output.push({ tag: td.textContent.slice(1, -1), url, description });
    }
  }

  return output;
}

/**
 * @typedef TagData
 * @property {string} tag
 * @property {string} description
 * @property {AttributeData[]} attributes
 *
 * @typedef AttributeData
 * @property {string} name
 * @property {boolean} deprecated
 * @property {boolean} nonStandard
 * @property {boolean} experimental
 */

/**
 * @param {TagMetadata} metadata
 * @returns {Promise<TagData>}
 */
async function parseTagPage(metadata) {
  /** @type {TagData}  */
  const output = { tag: metadata.tag, description: metadata.description, attributes: [] };
  if (!metadata.url) return Promise.resolve(output);

  const html = await (await fetch(metadata.url)).text();
  const document = new JSDOM(html).window.document;
  const dts = document.querySelectorAll(
    "section[aria-labelledby*=attributes]:not([aria-labelledby=global_attributes]) > div > dl > dt"
  );

  for (const dt of dts) {
    const name = dt.querySelector("code").textContent;
    /** @type {AttributeData} */
    const attribute = { name, deprecated: false, experimental: false, nonStandard: false };

    for (const span of dt.querySelectorAll("abbr > span")) {
      const text = span.textContent.toLowerCase();
      attribute.deprecated = attribute.deprecated || text === "deprecated";
      attribute.experimental = attribute.experimental || text === "experimental";
      attribute.nonStandard = attribute.nonStandard || text === "nonStandard";
    }

    output.attributes.push(attribute);
  }

  return output;
}
