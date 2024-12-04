const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs"); // File system module
const readlineSync = require("readline-sync"); // For user input
const { Parser } = require("json2csv"); // Library to convert JSON to CSV
const path = require("path"); // Importing path module for file paths

// Regular expression to match email addresses
const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]+/g;

// Regular expression to match city and state in "City, State" format
const cityStateRegex = /^([^,]+),\s*([A-Z]{2})$/;

const categories = [
  "wedding-reception-venues",
  "wedding-photographers",
  "wedding-videographers",
  "bridal-salons",
  "beauty-services",
  "wedding-djs",
  "live-wedding-bands",
  "florists",
  "wedding-planners",
  "jewelers",
  "wedding-cake-bakeries",
  "bar-services",
  "catering",
  "wedding-dance-lessons",
  "wedding-decor-shops",
  "wedding-soloists-ensembles",
  "favors",
  "invitations",
  "wedding-officiants",
  "wedding-photo-booth-rentals",
  "rehearsal-dinners-bridal-showers",
  "wedding-rentals",
  "transportation-services",
  "wedding-travel-agents",
];

const locations = {
  "New York, NY": "new-york-ny",
  "Long Island, NY": "long-island-ny",
  "Los Angeles, CA": "los-angeles-ca",
  "Twin Cities, MN": "twin-cities-mn",
  "Chicago, IL": "chicago-il",
  "Brooklyn, NY": "brooklyn-ny",
  "Queens, NY": "queens-ny",
  "Houston, TX": "houston-tx",
  "Manhattan, NY": "manhattan-ny",
  "Philadelphia, PA": "philadelphia-pa",
  "Phoenix, AZ": "phoenix-az",
  "The Bronx, NY": "the-bronx-ny",
  "Bronx, NY": "bronx-ny",
  "San Antonio, TX": "san-antonio-tx",
  "San Diego, CA": "san-diego-ca",
  "Dallas, TX": "dallas-tx",
  "Honolulu, HI": "honolulu-hi",
  "Westchester, NY": "westchester-ny",
  "Fairfield, CT": "fairfield-ct",
  "Austin, TX": "austin-tx",
  "Indianapolis, IN": "indianapolis-in",
  "Jacksonville, FL": "jacksonville-fl",
  "Ventura, CA": "ventura-ca",
  "San Francisco, CA": "san-francisco-ca",
  "Columbus, OH": "columbus-oh",
  "Charlotte, NC": "charlotte-nc",
  "Fort Worth, TX": "fort-worth-tx",
  "Detroit, MI": "detroit-mi",
  "Norfolk, MA": "norfolk-ma",
  "El Paso, TX": "el-paso-tx",
  "Jefferson, AL": "jefferson-al",
  "Memphis, TN": "memphis-tn",
  "Seattle, WA": "seattle-wa",
  "Denver, CO": "denver-co",
  "Washington, DC": "washington-dc",
  "Boston, MA": "boston-ma",
  "Nashville, TN": "nashville-tn",
  "Baltimore, MD": "baltimore-md",
  "Oklahoma City, OK": "oklahoma-city-ok",
  "Louisville, KY": "louisville-ky",
  "Portland, OR": "portland-or",
  "Arapahoe, CO": "arapahoe-co",
  "Las Vegas, NV": "las-vegas-nv",
  "Milwaukee, WI": "milwaukee-wi",
  "Johnson, KS": "johnson-ks",
  "Albuquerque, NM": "albuquerque-nm",
  "Jefferson, CO": "jefferson-co",
  "Tucson, AZ": "tucson-az",
  "Kane, IL": "kane-il",
  "Fresno, CA": "fresno-ca",
  "Chester, PA": "chester-pa",
  "Passaic, NJ": "passaic-nj",
  "Sedgwick, KS": "sedgwick-ks",
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

// Get current timestamp
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-"); // Format timestamp to avoid issues in filenames
};

// Function to extract city and state from the address
const extractCityState = (address) => {
  const match = address.match(cityStateRegex);
  if (match) {
    return { city: match[1].trim(), state: match[2].trim() };
  }
  return { city: "N/A", state: "N/A" };
};

// Save vendor data incrementally to JSON
const saveVendorDataToFile = (vendorInfo, jsonFilePath) => {
  let currentData = [];
  if (fs.existsSync(jsonFilePath)) {
    currentData = JSON.parse(fs.readFileSync(jsonFilePath, "utf-8"));
  }
  currentData.push(vendorInfo);
  fs.writeFileSync(jsonFilePath, JSON.stringify(currentData, null, 2), "utf-8");
};

// Function to save vendor data as a CSV file
const saveVendorDataToCSV = (vendorData, csvFilePath) => {
  const csvParser = new Parser({
    fields: [
      "heading",
      "guestCapacity",
      "startingPrice",
      "address",
      "city",
      "state",
      "phoneNumber",
      "emailAddresses",
      "websiteLink",
      "facebookLink",
      "instagramLink",
      "pinterestLink",
      "knotPageLink",
      "category",
      "location",
    ],
  });

  const csvData = csvParser.parse(vendorData);
  fs.writeFileSync(csvFilePath, csvData, "utf-8");
};

// Main function to scrape data
(async () => {
  try {
    const timestamp = getTimestamp();
    const jsonFilePath = path.join(
      process.cwd(),
      `vendorData_${timestamp}.json`
    );
    const csvFilePath = path.join(process.cwd(), `vendorData_${timestamp}.csv`);
    let vendorData = [];

    // Loop through categories
    for (const selectedCategory of categories) {
      let page = 1;
      let hasMoreVendors = true;

      while (hasMoreVendors) {
        const url = `https://www.theknot.com/marketplace/${selectedCategory}-${selectedLocation}?sort=featured&page=${page}`;
        console.log(
          `Fetching page ${page} for category "${selectedCategory}": ${url}`
        );

        try {
          const response = await axios.get(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
          });

          const $ = cheerio.load(response.data);
          const anchorTags = $('a[class*="info-container--d187a"]');
          let links = [];

          anchorTags.each((i, el) => {
            const link = $(el).attr("href");
            if (link) links.push(`https://www.theknot.com${link}`);
          });

          if (links.length === 0) {
            console.log(
              `No more entries on page ${page} for category "${selectedCategory}".`
            );
            hasMoreVendors = false;
            break;
          }

          for (const link of links) {
            try {
              console.log(`Fetching vendor page: ${link}`);
              const vendorResponse = await axios.get(link, {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                },
              });

              const $vendorPage = cheerio.load(vendorResponse.data);
              const heading = $vendorPage(
                "div.vendor-name-favorites-container--33583"
              )
                .text()
                .trim();
              const guestCapacity = $vendorPage(
                "div.detailValue--18b29.body1--e44d4"
              )
                .text()
                .trim();
              const address = $vendorPage("span.link-underline--5f492")
                .text()
                .trim();
              const { city, state } = extractCityState(address);
              // const startingPrice =
              //   $vendorPage("div")
              //     .filter((i, el) =>
              //       ["starting price:", "starting cost:"].some((term) =>
              //         $(el).text().toLowerCase().includes(term)
              //       )
              //     )
              //     .text()
              //     .trim() || "N/A";
              const startingPrice = "n/a";

              const websiteLink =
                $vendorPage('a[title="Website"]').attr("href") || "N/A";
              const facebookLink =
                $vendorPage('a[title="facebook"]').attr("href") || "N/A";
              const instagramLink =
                $vendorPage('a[title="instagram"]').attr("href") || "N/A";
              const pinterestLink =
                $vendorPage('a[title="pinterest"]').attr("href") || "N/A";

              const phone = $vendorPage("a[href^='tel:']").attr("href");
              const phoneNumber = phone
                ? phone.replace("tel:", "").trim()
                : "N/A";

              let uniqueEmailAddresses = ["N/A"];
              if (websiteLink !== "N/A") {
                const emailsFound = $vendorPage.text().match(emailRegex) || [];
                uniqueEmailAddresses = [...new Set(emailsFound)];
              }

              const vendorInfo = {
                heading: heading || "N/A",
                guestCapacity: guestCapacity || "N/A",
                startingPrice,
                address: address || "N/A",
                city,
                state,
                phoneNumber,
                emailAddresses: uniqueEmailAddresses.join(", "),
                websiteLink,
                facebookLink,
                instagramLink,
                pinterestLink,
                knotPageLink: link,
                category: selectedCategory,
                location: locationKeys[locationIndex],
              };

              vendorData.push(vendorInfo);
              saveVendorDataToFile(vendorInfo, jsonFilePath);
              console.log(`Extracted data for vendor: `, vendorInfo);
            } catch (vendorError) {
              console.error(
                `Error fetching vendor page: ${link}`,
                vendorError.message
              );
            }
          }

          page++;
        } catch (pageError) {
          console.error(`Error fetching page ${page}: ${pageError.message}`);
          hasMoreVendors = false;
        }
      }
    }

    saveVendorDataToCSV(vendorData, csvFilePath);
    console.log(`Data extraction complete. JSON saved to ${jsonFilePath}`);
    console.log(`Data saved to CSV: ${csvFilePath}`);
  } catch (error) {
    console.error("Error during data extraction:", error.message);
  }
})();
