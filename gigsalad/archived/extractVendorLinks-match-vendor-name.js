const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// Define file paths
const inputFilePath = "./vendorData.json";
const outputFilePath = "./vendorDataWithLinksAndEmails.json";

// SerpAPI configuration
const apiKey =
  "3085e85f6d2f400dba636d3bc977e728f260967a4feeda2e4586039ffab9fd56";
const serpApiUrl = "https://serpapi.com/search.json";

// Regular expression for finding email addresses
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Define a realistic User-Agent header
const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
};

// Domains to exclude from processing
const excludedDomains = [
  "gigsalad.com",
  "pinterest.com",
  "youtube.com",
  "thebash.com",
];

// Function to check if a URL should be excluded
function shouldExcludeLink(url) {
  return excludedDomains.some((domain) => url.includes(domain));
}

// Read the vendor data from JSON file
function readVendorData() {
  try {
    const data = fs.readFileSync(inputFilePath);
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading vendor data:", error);
    return [];
  }
}

// Initialize the output JSON file with an empty array or existing data
function initializeOutputFile() {
  if (!fs.existsSync(outputFilePath)) {
    fs.writeFileSync(outputFilePath, JSON.stringify([]), "utf-8");
  }
}

// Function to append each vendor's data to the JSON file
function appendVendorData(vendor) {
  try {
    const currentData = JSON.parse(fs.readFileSync(outputFilePath));
    currentData.push(vendor);
    fs.writeFileSync(
      outputFilePath,
      JSON.stringify(currentData, null, 2),
      "utf-8"
    );
    console.log(`Appended data for ${vendor.vendorName} to ${outputFilePath}`);
  } catch (error) {
    console.error("Error appending vendor data:", error);
  }
}

// Function to search for vendor-related links using SERP API
async function findVendorRelatedLinks(vendor) {
  const { vendorName, profileCategory } = vendor;
  const query = `${vendorName} ${profileCategory}`;
  const url = `${serpApiUrl}?q=${encodeURIComponent(query)}&api_key=${apiKey}`;

  try {
    const { data } = await axios.get(url, { headers });

    const nameWords = vendorName.split(" ").map((word) => word.toLowerCase());
    const vendorRelatedLinks = [];

    if (data.organic_results && data.organic_results.length > 0) {
      data.organic_results.forEach((result) => {
        if (result.title) {
          const title = result.title.toLowerCase();
          const isMatch = nameWords.every((word) => title.includes(word));

          // Check if the link should be excluded before adding
          if (isMatch && !shouldExcludeLink(result.link)) {
            vendorRelatedLinks.push(result.link);
          }
        }
      });
    }

    vendor.vendorRelatedLinks = vendorRelatedLinks;
    console.log(`Found ${vendorRelatedLinks.length} links for ${vendorName}`);
  } catch (error) {
    console.error(
      `Error fetching search results for ${vendorName}:`,
      error.message
    );
    vendor.vendorRelatedLinks = [];
  }
}

// Function to scrape email addresses from each vendor-related link, including "Contact" and "About" pages
async function findEmailsFromLinks(vendor) {
  const emailAddresses = new Set();

  for (const link of vendor.vendorRelatedLinks) {
    try {
      const { data } = await axios.get(link, { headers });
      const $ = cheerio.load(data);

      const mainPageEmails = data.match(emailRegex) || [];
      mainPageEmails.forEach((email) => emailAddresses.add(email));

      const internalLinks = new Set();
      $("a[href]").each((index, element) => {
        const href = $(element).attr("href");
        if (href && !href.startsWith("mailto:") && !href.startsWith("#")) {
          const fullUrl = href.startsWith("http")
            ? href
            : new URL(href, link).href;
          // Add internal links, skipping excluded domains
          if (!shouldExcludeLink(fullUrl)) {
            internalLinks.add(fullUrl);
          }
        }
      });

      const priorityLinks = [...internalLinks].filter(
        (url) =>
          url.toLowerCase().includes("contact") ||
          url.toLowerCase().includes("contact us") ||
          url.toLowerCase().includes("about us") ||
          url.toLowerCase().includes("about")
      );

      for (const priorityLink of priorityLinks) {
        try {
          const { data: priorityData } = await axios.get(priorityLink, {
            headers,
          });
          const priorityEmails = priorityData.match(emailRegex) || [];
          priorityEmails.forEach((email) => emailAddresses.add(email));
        } catch (error) {
          console.error(
            `Error fetching email from priority link ${priorityLink}:`,
            error.message
          );
        }
      }
    } catch (error) {
      console.error(
        `Error fetching page for email extraction from ${link}:`,
        error.message
      );
    }
  }

  vendor.emailAddresses = Array.from(emailAddresses);
  console.log(
    `Found ${vendor.emailAddresses.length} unique emails for ${vendor.vendorName}`
  );
}

// Main function to process each vendor
async function processVendors() {
  initializeOutputFile();
  const vendors = readVendorData();

  for (const vendor of vendors) {
    console.log(`Searching links for ${vendor.vendorName}...`);
    await findVendorRelatedLinks(vendor);
    await findEmailsFromLinks(vendor);
    appendVendorData(vendor);
  }
}

// Run the main function
processVendors();
