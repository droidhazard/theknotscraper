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
const vendorData = [];

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

// Function to scrape individual vendor profiles
async function scrapeVendorProfile(vendorUrl) {
  try {
    // Fetch the HTML from the vendor page
    const { data } = await axios.get(vendorUrl);

    // Load the HTML into Cheerio for parsing
    const $ = cheerio.load(data);

    // Extract the vendor name from the h1 tag with the specified class
    const vendorName = $("h1.profile-vendor-card__act-name").text().trim();

    // Extract the vendor rating from the div with the specified class
    const vendorRating = $("div.profile-vendor-card__rating-count")
      .text()
      .trim();

    // Extract the vendor location from the li element containing the location icon
    const vendorLocation = $("li")
      .has("svg.gigsalad-icon-profile-location")
      .text()
      .trim();

    // Extract the profile category from the li element containing the category icon
    const profileCategory = $("li")
      .has("svg.gigsalad-icon-profile-category")
      .text()
      .trim();

    // Extract the distance from the li element containing the distance icon
    const distance = $("li")
      .has("svg.gigsalad-icon-profile-distance")
      .text()
      .trim();

    // Extract the vendor price from the li element containing the price icon
    const vendorPrice = $("li")
      .has("svg.gigsalad-icon-profile-price")
      .text()
      .trim();

    // Extract the gig length from the p element containing a span with "Gig Length:"
    const gigLength = $("p").has("span:contains('Gig Length:')").text().trim();

    // Create a temporary object to hold vendor data
    if (vendorName) {
      const vendorInfo = {
        vendorName: vendorName,
        vendorRating: vendorRating || "No rating available", // Default text if rating is not found
        vendorLocation: vendorLocation || "No location available", // Default text if location is not found
        profileCategory: profileCategory || "No category available", // Default text if category is not found
        distance: distance || "No distance available", // Default text if distance is not found
        vendorPrice: vendorPrice || "No price available", // Default text if price is not found
        gigLength: gigLength || "No gig length available", // Default text if gig length is not found
      };

      // Add the vendor data to the main array
      vendorData.push(vendorInfo);
    }
  } catch (error) {
    console.error(
      `Error scraping vendor profile at ${vendorUrl}:`,
      error.message
    );
  }
}

// Main function to run all scraping tasks
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

  // Loop over each vendor page to scrape vendor details
  for (const vendorPath of vendorPages) {
    // Construct the full URL for each vendor
    const vendorUrl = `https://www.gigsalad.com${vendorPath}`;
    console.log(`Scraping vendor profile at ${vendorUrl}...`);

    // Scrape the vendor profile and add to vendorData array
    await scrapeVendorProfile(vendorUrl);
  }

  // Output the results to the console
  console.log("Unique Vendor Subcategories:", uniqueVendorSubcategories);
  console.log("Vendor Pages:", vendorPages);
  console.log("Vendor Data:", vendorData);
}

// Run the scraper function
scrapeWebsite();
