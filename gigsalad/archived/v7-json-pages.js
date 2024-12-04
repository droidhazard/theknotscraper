// scraper.js

// Import required libraries
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// Input object containing all category and subcategory links
const categoryLinks = {
  ENTERTAINERS: {
    most_popular: [
      "https://www.gigsalad.com/Circus-Entertainment/Acrobat",
      "https://www.gigsalad.com/Variety/Balloon-Artist",
      "https://www.gigsalad.com/Music-Groups",
      "https://www.gigsalad.com/Circus-Entertainment/Clown",
      "https://www.gigsalad.com/Comedians-Emcees",
      "https://www.gigsalad.com/Dance",
    ],
    // Add additional categories and links as needed
  },
  // Add additional main categories as needed
};

// Define the JSON file path
const jsonFilePath = "./vendorData.json";

// Clear JSON file at the beginning of each run
function initializeJsonFile() {
  fs.writeFileSync(jsonFilePath, JSON.stringify([]));
  console.log("Initialized vendorData.json file.");
}

// Function to save progress to the JSON file
function saveProgressToJson(vendorInfo) {
  const currentData = JSON.parse(fs.readFileSync(jsonFilePath));
  currentData.push(vendorInfo);
  fs.writeFileSync(jsonFilePath, JSON.stringify(currentData, null, 2));
  console.log(`Appended vendor data to vendorData.json.`);
}

// Function to scrape vendor links from a subcategory page
async function scrapeVendorLinks(categoryUrl) {
  try {
    // Fetch the HTML from the subcategory page
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

    // Extract the vendor details
    const vendorName = $("h1.profile-vendor-card__act-name").text().trim();
    const vendorRating = $("div.profile-vendor-card__rating-count")
      .text()
      .trim();
    const vendorLocation = $("li")
      .has("svg.gigsalad-icon-profile-location")
      .text()
      .trim();
    const profileCategory = $("li")
      .has("svg.gigsalad-icon-profile-category")
      .text()
      .trim();
    const distance = $("li")
      .has("svg.gigsalad-icon-profile-distance")
      .text()
      .trim();
    const vendorPrice = $("li")
      .has("svg.gigsalad-icon-profile-price")
      .text()
      .trim();
    const gigLength = $("p").has("span:contains('Gig Length:')").text().trim();
    const insurance = $("p").has("span:contains('Insurance:')").text().trim();
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

      // Save the vendor data to JSON file after each vendor is scraped
      saveProgressToJson(vendorInfo);
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

  // Loop through each main category in the input object
  for (const mainCategory in categoryLinks) {
    for (const subCategory in categoryLinks[mainCategory]) {
      const subCategoryUrls = categoryLinks[mainCategory][subCategory];
      console.log(`Scraping vendors from subcategory: ${subCategory}`);

      // Loop over each subcategory URL and scrape vendor links
      for (const categoryUrl of subCategoryUrls) {
        console.log(`Scraping vendor links from ${categoryUrl}...`);
        const vendorLinks = await scrapeVendorLinks(categoryUrl);

        // Loop over each vendor link and scrape vendor profile details
        for (const vendorUrl of vendorLinks) {
          console.log(`Scraping vendor profile at ${vendorUrl}...`);
          await scrapeVendorProfile(vendorUrl);
        }
      }
    }
  }

  console.log("Scraping completed.");
}

// Run the scraper function
scrapeWebsite();
