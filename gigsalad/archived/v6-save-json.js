// scraper.js

// Import required libraries
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// Define the URLs to scrape
const pages = [
  "https://www.gigsalad.com/book-entertainers",
  "https://www.gigsalad.com/book-music",
  "https://www.gigsalad.com/book-services",
  "https://www.gigsalad.com/book-speakers",
];

// Arrays to hold extracted data
const vendorSubcategory = [];
const vendorData = [];

// Define the JSON file path
const jsonFilePath = "./vendorData.json";

// Clear JSON file at the beginning of each run
function initializeJsonFile() {
  fs.writeFileSync(jsonFilePath, JSON.stringify([]));
  console.log("Initialized vendorData.json file.");
}

// Function to save progress to the JSON file
function saveProgressToJson(vendorInfo) {
  // Read the current data
  const currentData = JSON.parse(fs.readFileSync(jsonFilePath));

  // Append the new vendor info
  currentData.push(vendorInfo);

  // Write updated data back to the file
  fs.writeFileSync(jsonFilePath, JSON.stringify(currentData, null, 2));
  console.log("Saved current progress to vendorData.json.");
}

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

// Function to scrape vendor links from a category page
async function scrapeVendorLinks(categoryUrl) {
  try {
    // Fetch the HTML from the category page
    const { data } = await axios.get(categoryUrl);

    // Load the HTML into Cheerio for parsing
    const $ = cheerio.load(data);

    // Array to hold vendor profile links for this category
    const vendorLinks = [];

    // Extract 'href' values of anchor tags with class "text--default"
    $("a.text--default").each((index, element) => {
      const href = $(element).attr("href");
      if (href) {
        vendorLinks.push(`https://www.gigsalad.com${href}`);
      }
    });

    // Return the array of vendor links for this category
    return vendorLinks;
  } catch (error) {
    console.error(
      `Error scraping vendor links at ${categoryUrl}:`,
      error.message
    );
    return [];
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

    // Extract the insurance information from the p element containing a span with "Insurance:"
    const insurance = $("p").has("span:contains('Insurance:')").text().trim();

    // Extract additional booking notes, remove tab characters from the text
    const vendorNotes = $(
      "div.profile-booking-info-subsection:contains('Additional Booking Notes')"
    )
      .text()
      .replace(/\t/g, "")
      .trim();

    // Extract services offered by the vendor from anchor tags with specific class
    const servicesOffered = [];
    $("a.small.light-gray.button").each((index, element) => {
      servicesOffered.push($(element).text().trim());
    });

    // Create a temporary object to hold vendor data
    if (vendorName) {
      const vendorInfo = {
        vendorName,
        vendorRating: vendorRating || "No rating available",
        vendorLocation: vendorLocation || "No location available",
        profileCategory: profileCategory || "No category available",
        distance: distance || "No distance available",
        vendorPrice: vendorPrice || "No price available",
        gigLength: gigLength || "No gig length available",
        insurance: insurance || "No insurance information available",
        vendorNotes: vendorNotes || "No additional booking notes available",
        servicesOffered: servicesOffered.length
          ? servicesOffered
          : ["No services listed"],
      };

      // Print the current scraped vendor data
      console.log("Scraped Vendor Data:", vendorInfo);

      // Add the vendor data to the main array and save progress
      vendorData.push(vendorInfo);
      saveProgressToJson(vendorInfo); // Save the vendor data to JSON file
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
  // Initialize JSON file at the beginning
  initializeJsonFile();

  // Step 1: Scrape each page in the 'pages' array for vendor subcategories
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

  // Print the unique vendor subcategories
  console.log("Unique Vendor Subcategories:", uniqueVendorSubcategories);

  // Step 2: Loop over each subcategory to extract vendor links and profiles
  for (const subcategoryPath of uniqueVendorSubcategories) {
    // Construct the full URL for each subcategory
    const categoryUrl = `https://www.gigsalad.com${subcategoryPath}`;
    console.log(
      `Scraping vendor links from category page at ${categoryUrl}...`
    );

    // Scrape vendor links from the category page
    const vendorLinks = await scrapeVendorLinks(categoryUrl);

    // Step 3: Loop over each vendor link and scrape vendor profile details
    for (const vendorUrl of vendorLinks) {
      console.log(`Scraping vendor profile at ${vendorUrl}...`);
      await scrapeVendorProfile(vendorUrl);
    }
  }

  // Output the overall results to the console
  console.log("Vendor Data:", vendorData);
}

// Run the scraper function
scrapeWebsite();
