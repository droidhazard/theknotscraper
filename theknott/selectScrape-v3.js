const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs"); // File system module
const readlineSync = require("readline-sync"); // For user input

// Regular expression to match email addresses
const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]+/g;

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

// Prompt the user to select a category
const categoryIndex = readlineSync.keyInSelect(
  categories,
  "Select a category:"
);
if (categoryIndex === -1) {
  console.log("No category selected. Exiting...");
  process.exit(); // Exit if the user cancels the selection
}
const selectedCategory = categories[categoryIndex];

// Function to clean invalid emails (starting with 'n' followed by capital letter)
const cleanInvalidEmails = (emails) => {
  return emails.filter((email) => !/^n[A-Z]/.test(email));
};

(async () => {
  try {
    let page = 1;
    let hasMoreVendors = true;
    let vendorData = []; // Array to store extracted data for each vendor

    while (hasMoreVendors) {
      const url = `https://www.theknot.com/marketplace/${selectedCategory}-${selectedLocation}?sort=featured&page=${page}`;
      console.log(`Fetching page ${page}: ${url}`);

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
        console.log(`No more entries found on page ${page}. Stopping.`);
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

          // Find the actual website link from the anchor tag with title "Website"
          const websiteLink =
            $vendorPage('a[title="Website"]')
              .filter((i, el) => $(el).text().trim() === "Website")
              .attr("href") || "N/A";

          // Extract the address (span with class 'link-underline--5f492')
          const address = $vendorPage("span.link-underline--5f492")
            .text()
            .trim();

          // Extract the phone number (anchor tag with href starting with 'tel:')
          const phone = $vendorPage("a[href^='tel:']").attr("href");
          const phoneNumber = phone ? phone.replace("tel:", "").trim() : "N/A";

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

          // Create an object with the extracted data, including unique social links, email addresses, website link, and knot page link
          const vendorInfo = {
            heading: heading || "N/A",
            guestCapacity: guestCapacity || "N/A",
            address: address || "N/A",
            phoneNumber: phoneNumber || "N/A", // Add phone number field
            emailAddresses:
              uniqueEmailAddresses.length > 0 ? uniqueEmailAddresses : ["N/A"], // Add unique email addresses
            websiteLink: websiteLink, // Extract the website link from "Website" anchor
            knotPageLink: link, // Add the Knot page link
            category: selectedCategory, // Add the selected category
            location: locationKeys[locationIndex], // Add the selected location (display name)
          };

          // Push the object to the vendorData array
          vendorData.push(vendorInfo);
          console.log(`Extracted data for vendor: `, vendorInfo);
        } catch (vendorError) {
          console.error(`Error fetching the vendor page: ${link}`, vendorError);
        }
      }

      // Increment the page number
      page++;
    }

    // Log or save the vendor data
    console.log("All extracted vendor data:", vendorData);

    // Save the vendor data to a file
    const filePath = `${process.cwd()}/vendorData.json`;
    fs.writeFile(filePath, JSON.stringify(vendorData, null, 2), (err) => {
      if (err) {
        console.error("Error saving the vendor data to file:", err);
      } else {
        console.log(`Vendor data successfully saved to ${filePath}`);
      }
    });
  } catch (error) {
    // Handle any errors that occur during the fetching or file writing process
    console.error("Error fetching the main page or writing the file:", error);
  }
})();
