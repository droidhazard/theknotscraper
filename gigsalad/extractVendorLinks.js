const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// Constants
const REQUEST_TIMEOUT = 5000; // 5 seconds timeout
const inputFilePath = "./vendorData.json";
const outputFilePath = "./vendorDataWithLinksAndEmails.json";
const apiKey =
  "3085e85f6d2f400dba636d3bc977e728f260967a4feeda2e4586039ffab9fd56"; // Replace with your actual SerpAPI key
const serpApiUrl = "https://serpapi.com/search.json";
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Headers
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
};

// Domains to exclude
const excludedDomains = [
  "gigsalad.com",
  "pinterest.com",
  "youtube.com",
  "thebash.com",
  "facebook.com",
  "reddit.com",
  "wikipedia.com",
  "instagram.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "soundcloud.com",
  "spotify.com",
  "yelp.com",
  "apple.com",
  "alibaba.com",
  "aliexpress.com",
  // Add more domains here...
];

// Utility to check if a URL should be excluded
function shouldExcludeLink(url) {
  return excludedDomains.some((domain) => url.includes(domain));
}

// Read vendor data from file
function readVendorData() {
  try {
    const data = fs.readFileSync(inputFilePath);
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading vendor data:", error);
    return [];
  }
}

// Initialize output file
function initializeOutputFile() {
  if (!fs.existsSync(outputFilePath)) {
    fs.writeFileSync(outputFilePath, JSON.stringify([]), "utf-8");
  }
}

// Append vendor data to output file
function appendVendorData(vendor) {
  try {
    const currentData = JSON.parse(fs.readFileSync(outputFilePath));
    currentData.push(vendor);
    fs.writeFileSync(
      outputFilePath,
      JSON.stringify(currentData, null, 2),
      "utf-8"
    );
    console.log(`Appended data for ${vendor.vendorName}`);
  } catch (error) {
    console.error("Error appending vendor data:", error);
  }
}

// Function to fetch data with timeout
async function fetchDataWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await axios.get(url, {
      headers,
      signal: controller.signal,
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${url}: ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Find vendor-related links using SERP API
async function findVendorRelatedLinks(vendor) {
  const { vendorName, profileCategory } = vendor;
  const query = `${vendorName} ${profileCategory}`;
  const url = `${serpApiUrl}?q=${encodeURIComponent(query)}&api_key=${apiKey}`;

  const data = await fetchDataWithTimeout(url);
  const vendorRelatedLinks = [];

  if (data && data.organic_results) {
    data.organic_results.forEach((result) => {
      if (!shouldExcludeLink(result.link)) {
        vendorRelatedLinks.push(result.link);
      }
    });
  }

  vendor.vendorRelatedLinks = vendorRelatedLinks;
  console.log(`Found ${vendorRelatedLinks.length} links for ${vendorName}`);
}

// Extract emails from links
async function findEmailsFromLinks(vendor) {
  const emailAddresses = new Set();

  for (const link of vendor.vendorRelatedLinks) {
    const data = await fetchDataWithTimeout(link);
    if (data) {
      const emails = data.match(emailRegex) || [];
      emails.forEach((email) => {
        if (
          !email.includes(".png") &&
          !email.includes(".jpg") &&
          !email.toLowerCase().includes("example")
        ) {
          emailAddresses.add(email);
        }
      });
    }
  }

  vendor.emailAddresses = Array.from(emailAddresses);
  console.log(
    `Found ${vendor.emailAddresses.length} emails for ${vendor.vendorName}`
  );
}

// Main function to process vendors
async function processVendors() {
  initializeOutputFile();
  const vendors = readVendorData();

  for (const vendor of vendors) {
    console.log(`Processing ${vendor.vendorName}...`);
    await findVendorRelatedLinks(vendor);
    await findEmailsFromLinks(vendor);
    appendVendorData(vendor);
  }
}

// Start the process
processVendors();
