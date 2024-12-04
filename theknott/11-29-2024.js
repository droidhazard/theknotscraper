const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs"); // File system module
const readlineSync = require("readline-sync"); // For user input
const { Parser } = require("json2csv"); // Library to convert JSON to CSV

// Regular expression to match email addresses
const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]+/g;

// Regular expression to match city and state in "City, State" format
const cityStateRegex = /^([^,]+),\s*([A-Z]{2})$/;

const categories = [
  "wedding-reception-venues",
  "wedding-photographers",
  "wedding-videographers",
  //... add other categories
];

const locations = {
  "New York, NY": "new-york-ny",
  "Long Island, NY": "long-island-ny",
  //... add other locations
};

// Display all locations with numbers for the user to select
console.log("Select a location by entering the corresponding number:");
const locationKeys = Object.keys(locations);
locationKeys.forEach((location, index) => {
  console.log(`${index + 1}: ${location}`);
});

// Ask for user input to select the location
const locationIndex =
  readlineSync.questionInt("\nEnter the number of the location: ") - 1;

// Validate user input
if (locationIndex < 0 || locationIndex >= locationKeys.length) {
  console.log("Invalid location number. Exiting...");
  process.exit(); // Exit if the input is invalid
}

const selectedLocation = locations[locationKeys[locationIndex]];

// Function to clean invalid emails (starting with 'n' followed by capital letter)
const cleanInvalidEmails = (emails) => {
  return emails.filter((email) => !/^n[A-Z]/.test(email));
};

// Function to extract city and state from the address
const extractCityState = (address) => {
  const match = address.match(cityStateRegex);
  if (match) {
    return { city: match[1].trim(), state: match[2].trim() };
  }
  return { city: "N/A", state: "N/A" };
};

// Function to append vendor data to the JSON file continuously
const saveVendorDataToFile = (vendorInfo, filePath) => {
  let currentData = [];
  if (fs.existsSync(filePath)) {
    const fileData = fs.readFileSync(filePath);
    currentData = JSON.parse(fileData); // Read the existing data
  }
  currentData.push(vendorInfo); // Append new vendor info

  // Save updated data
  fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2));
};

// Main function to scrape data
(async () => {
  try {
    const jsonFilePath = `${process.cwd()}/vendorData.json`; // Fixed JSON file path

    // Loop through all categories
    for (const selectedCategory of categories) {
      let page = 1;
      let hasMoreVendors = true;

      while (hasMoreVendors) {
        const url = `https://www.theknot.com/marketplace/${selectedCategory}-${selectedLocation}?sort=featured&page=${page}`;
        console.log(
          `Fetching page ${page} for category "${selectedCategory}": ${url}`
        );

        const response = await axios.get(url);
        console.log(`Status code: ${response.status}`);

        // Load the HTML into Cheerio
        const $ = cheerio.load(response.data);

        // Select all anchor tags with the class containing "info-container--2d227"
        const anchorTags = $('a[class*="info-container--2d227"]');

        // Extract the href attribute from each anchor tag
        let links = [];
        anchorTags.each((i, el) => {
          const link = $(el).attr("href");
          if (link) {
            links.push(link);
          }
        });

        if (links.length === 0) {
          console.log(
            `No more entries found on page ${page} for category "${selectedCategory}".`
          );
          hasMoreVendors = false;
          break;
        }

        // Prefix links with base URL (these are the Knot page links)
        links = links.map((link) => {
          return `https://www.theknot.com${link}`;
        });

        // * OPEN EACH VENDOR WEBSITE AND EXTRACT THE DATA
        for (const link of links) {
          try {
            console.log(`Fetching vendor page: ${link}`);
            const vendorResponse = await axios.get(link);
            const $vendorPage = cheerio.load(vendorResponse.data);

            // Extract the content of the h1 tag with the specific class hero-sm--d1e56
            const heading = $vendorPage(
              "div.vendor-name-favorites-container--33583"
            )
              .text()
              .trim();

            // Extract the guest capacity
            const guestCapacity = $vendorPage(
              "div.detailValue--18b29.body1--e44d4"
            )
              .text()
              .trim();

            // Extract the starting price or starting cost
            let startingPrice = "N/A"; // Default value if not found
            $vendorPage("div").each((i, el) => {
              const text = $(el).text().toLowerCase();
              if (
                text.includes("starting price:") ||
                text.includes("starting cost:")
              ) {
                startingPrice = $(el).text().trim(); // Extract innerText of the div
              }
            });

            // Find the actual website link from the anchor tag with title "Website"
            const websiteLink =
              $vendorPage('a[title="Website"]')
                .filter((i, el) => $(el).text().trim() === "Website")
                .attr("href") || "N/A";

            // Extract social links: Facebook, Instagram, and Pinterest
            const facebookLink =
              $vendorPage('a[title="facebook"]').attr("href") || "N/A";
            const instagramLink =
              $vendorPage('a[title="instagram"]').attr("href") || "N/A";
            const pinterestLink =
              $vendorPage('a[title="pinterest"]').attr("href") || "N/A";

            // Extract the address (span with class 'link-underline--5f492')
            const address = $vendorPage("span.link-underline--5f492")
              .text()
              .trim();

            // Extract the city and state from the address
            const { city, state } = extractCityState(address);

            // Extract the phone number (anchor tag with href starting with 'tel:')
            const phone = $vendorPage("a[href^='tel:']").attr("href");
            const phoneNumber = phone
              ? phone.replace("tel:", "").trim()
              : "N/A";

            // * SEARCH FOR EMAIL ADDRESSES ONLY IF WEBSITE EXISTS
            let uniqueEmailAddresses = ["N/A"]; // Default value if no emails are found
            if (websiteLink !== "N/A") {
              console.log(
                `Searching for email addresses on vendor page: ${link}`
              );
              const websiteText = $vendorPage.text(); // Extract all text from the page

              // Use regex to find any email addresses
              let emailsFound = websiteText.match(emailRegex);

              // Remove trailing characters like 'Read' from the extracted email
              if (emailsFound) {
                emailsFound = emailsFound.map((email) =>
                  email.replace(/(Read|read|READ)$/, "")
                );
              }

              // Clean invalid emails that start with 'n' followed by a capital letter
              emailsFound = cleanInvalidEmails(emailsFound || []);

              // Convert all emails to lowercase
              emailsFound = emailsFound.map((email) => email.toLowerCase());

              // Remove duplicate email addresses by converting to a Set and back to an array
              uniqueEmailAddresses = [...new Set(emailsFound)];
            } else {
              console.log(
                `No website link found for vendor: ${heading}. Skipping email extraction.`
              );
            }

            // Create an object with the extracted data
            const vendorInfo = {
              heading: heading || "N/A",
              guestCapacity: guestCapacity || "N/A",
              startingPrice: startingPrice || "N/A", // Add the starting price or cost
              address: address || "N/A",
              city: city || "N/A", // Add the city
              state: state || "N/A", // Add the state
              phoneNumber: phoneNumber || "N/A", // Add phone number field
              emailAddresses:
                uniqueEmailAddresses.length > 0
                  ? uniqueEmailAddresses
                  : ["N/A"], // Add unique email addresses
              websiteLink: websiteLink, // Extract the website link from "Website" anchor
              facebookLink: facebookLink, // Extract Facebook link
              instagramLink: instagramLink, // Extract Instagram link
              pinterestLink: pinterestLink, // Extract Pinterest link
              knotPageLink: link, // Add the Knot page link
              category: selectedCategory, // Add the selected category
              location: locationKeys[locationIndex], // Add the selected location (display name)
            };

            // Save vendor data to JSON file after each extraction
            saveVendorDataToFile(vendorInfo, jsonFilePath);

            console.log(`Extracted data for vendor: `, vendorInfo);
          } catch (vendorError) {
            console.error(
              `Error fetching the vendor page: ${link}`,
              vendorError
            );
          }
        }

        // Increment the page number
        page++;
      }
    }
  } catch (error) {
    // Handle any errors that occur during the fetching or file writing process
    console.error("Error fetching the main page or writing the file:", error);
  }
})();
