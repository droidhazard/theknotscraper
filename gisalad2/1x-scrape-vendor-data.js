const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// File paths
const vendorLinksFilePath = "./vendorPageLinks.json"; // Input file with vendor links
const vendorDataFilePath = "./vendorData.json"; // Output file for scraped vendor data
const checkpointFilePath = "./checkpoint-vendorData.json"; // File to store scraping progress

// Initialize JSON file for vendor data
function initializeVendorDataFile() {
  if (!fs.existsSync(vendorDataFilePath)) {
    fs.writeFileSync(vendorDataFilePath, JSON.stringify([]), "utf-8");
    console.log("Initialized vendorData.json file.");
  }
}

// Append vendor data to JSON file
function saveVendorData(vendorInfo) {
  const currentData = JSON.parse(fs.readFileSync(vendorDataFilePath));
  currentData.push(vendorInfo);
  fs.writeFileSync(
    vendorDataFilePath,
    JSON.stringify(currentData, null, 2),
    "utf-8"
  );
  console.log(`Appended data for ${vendorInfo.vendorName}`);
}

// Save checkpoint to resume scraping
function saveCheckpoint(index) {
  fs.writeFileSync(checkpointFilePath, JSON.stringify({ index }), "utf-8");
  console.log("Checkpoint saved:", { index });
}

// Load checkpoint if available
function loadCheckpoint() {
  if (fs.existsSync(checkpointFilePath)) {
    return JSON.parse(fs.readFileSync(checkpointFilePath));
  }
  return null;
}

// Scrape vendor profile data
async function scrapeVendorProfile(vendorUrl) {
  try {
    const { data } = await axios.get(vendorUrl);
    const $ = cheerio.load(data);

    const vendorInfo = {
      vendorName:
        $("h1.profile-vendor-card__act-name").text().trim() || "No Name",
      vendorRating:
        $("div.profile-vendor-card__rating-count").text().trim() || "No Rating",
      vendorLocation:
        $("li").has("svg.gigsalad-icon-profile-location").text().trim() ||
        "No Location",
      profileCategory:
        $("li").has("svg.gigsalad-icon-profile-category").text().trim() ||
        "No Category",
      vendorPrice:
        $("li").has("svg.gigsalad-icon-profile-price").text().trim() ||
        "No Price",
      servicesOffered: $("a.small.light-gray.button")
        .map((_, el) => $(el).text().trim())
        .get(),
      reviews:
        $("h2.beta.push--bottom:contains('Reviews')").text().trim() ||
        "No Reviews",
    };

    console.log("Scraped Vendor Data:", vendorInfo);
    saveVendorData(vendorInfo);
  } catch (error) {
    console.error(
      `Error scraping vendor profile at ${vendorUrl}: ${error.message}`
    );
  }
}

// Main function to process vendor links
async function processVendors() {
  initializeVendorDataFile();

  const vendorLinks = JSON.parse(fs.readFileSync(vendorLinksFilePath));
  const checkpoint = loadCheckpoint();
  const startIndex = checkpoint ? checkpoint.index : 0;

  console.log(`Starting from index: ${startIndex}`);

  for (let i = startIndex; i < vendorLinks.length; i++) {
    const vendorUrl = vendorLinks[i];
    console.log(
      `Scraping vendor profile at ${vendorUrl} (${i + 1}/${
        vendorLinks.length
      })...`
    );

    await scrapeVendorProfile(vendorUrl);

    // Save progress after each vendor
    saveCheckpoint(i + 1);
  }

  console.log("Scraping completed.");
}

// Start the scraper
processVendors().catch((err) => console.error("Error during scraping:", err));
