// scraper.js

// Import required libraries
const axios = require("axios");
const cheerio = require("cheerio");

// Define the URLs to scrape
const pages = [
  "https://www.gigsalad.com/book-entertainers",
  "https://www.gigsalad.com/book-music",
  "https://www.gigsalad.com/book-services",
  "https://www.gigsalad.com/book-speakers",
];

// Additional URL to scrape for vendor pages
const specificUrl = "https://www.gigsalad.com/Circus-Entertainment/Acrobat";

// Arrays to hold extracted data
const vendorSubcategory = [];
const vendorPages = [];

// Function to scrape subcategories from multiple pages
async function scrapePage(url) {
  try {
    // Fetch the HTML from the page
    const { data } = await axios.get(url);

    // Load the HTML into Cheerio for parsing
    const $ = cheerio.load(data);

    // Extract 'href' values of anchor tags without a class
    $("a:not([class])").each((index, element) => {
      const href = $(element).attr("href");
      if (href) {
        vendorSubcategory.push(href);
      }
    });
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
  }
}

// Function to scrape vendor pages from the specific URL
async function scrapeVendorPages(url) {
  try {
    // Fetch the HTML from the specified page
    const { data } = await axios.get(url);

    // Load the HTML into Cheerio for parsing
    const $ = cheerio.load(data);

    // Extract 'href' values of anchor tags with class "text--default"
    $("a.text--default").each((index, element) => {
      const href = $(element).attr("href");
      if (href) {
        vendorPages.push(href);
      }
    });
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
  }
}

// Main function to run both scraping tasks
async function scrapeWebsite() {
  // Scrape each page in the 'pages' array for vendor subcategories
  for (const pageUrl of pages) {
    console.log(`Scraping subcategory links from ${pageUrl}...`);
    await scrapePage(pageUrl);
  }

  // Remove duplicates, keeping only unique entries in vendorSubcategory
  const uniqueVendorSubcategories = vendorSubcategory.filter(
    (item, index, arr) => {
      return arr.indexOf(item) === arr.lastIndexOf(item);
    }
  );

  // Scrape the specific page for vendor pages
  console.log(`Scraping vendor pages from ${specificUrl}...`);
  await scrapeVendorPages(specificUrl);

  // Output the results to the console
  console.log("Unique Vendor Subcategories:", uniqueVendorSubcategories);
  console.log("Vendor Pages:", vendorPages);
}

// Run the scraper function
scrapeWebsite();
