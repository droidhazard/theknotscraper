const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// Define the URL to scrape
const pageUrl = "https://www.gigsalad.com/Disc-Jockeys-DJs";

// Define the JSON file path
const outputFilePath = "./vendorLinks.json";

// Function to extract href values from anchor tags without a class
async function extractLinks(url) {
  try {
    // Fetch the HTML from the specified URL
    const { data } = await axios.get(url);

    // Load the HTML into Cheerio for parsing
    const $ = cheerio.load(data);

    // Array to hold extracted href values
    const links = [];

    // Extract href values from <a> tags without a class
    $("a:not([class])").each((index, element) => {
      let href = $(element).attr("href");
      if (href) {
        // Prepend the base URL before adding to links array
        href = `https://www.gigsalad.com${href}`;
        links.push(href);
      }
    });

    // Write the extracted links to a JSON file
    fs.writeFileSync(outputFilePath, JSON.stringify(links, null, 2));
    console.log(`Extracted links saved to ${outputFilePath}`);
  } catch (error) {
    console.error(`Error extracting links from ${url}:`, error.message);
  }
}

// Run the link extraction function
extractLinks(pageUrl);
