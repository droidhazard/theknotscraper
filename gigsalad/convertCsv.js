const fs = require("fs");
const path = require("path");
const { Parser } = require("json2csv");

// Load the JSON data
const dataPath = "./sortedVendors.json";
const outputCSVPath = "./vendorsData.csv";

// Read JSON file
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

// Prepare an array to hold the flattened records
const records = [];

// Traverse and flatten the JSON data
for (const state in data) {
  for (const city in data[state]) {
    const categories = data[state][city];
    for (const topLevelCategory in categories) {
      const subCategories = categories[topLevelCategory];
      for (const subCategory in subCategories) {
        const thirdLevelCategories = subCategories[subCategory];
        for (const thirdLevelCategory in thirdLevelCategories) {
          const vendors = thirdLevelCategories[thirdLevelCategory];
          vendors.forEach((vendor) => {
            // Flattened vendor data
            records.push({
              state,
              city,
              topLevelCategory,
              subCategory,
              thirdLevelCategory,
              vendorName: vendor.vendorName || "",
              vendorRating: vendor.vendorRating || "",
              vendorLocation: vendor.vendorLocation || "",
              profileCategory: vendor.profileCategory || "",
              distance: vendor.distance || "",
              vendorPrice: vendor.vendorPrice || "",
              gigLength: vendor.gigLength || "",
              insurance: vendor.insurance || "",
              vendorNotes: vendor.vendorNotes || "",
              servicesOffered: vendor.servicesOffered
                ? vendor.servicesOffered.join(", ")
                : "",
              reviews: vendor.reviews || "",
              vendorRelatedLinks: vendor.vendorRelatedLinks
                ? vendor.vendorRelatedLinks.join(", ")
                : "",
              emailAddresses: vendor.emailAddresses
                ? vendor.emailAddresses.join(", ")
                : "",
            });
          });
        }
      }
    }
  }
}

// Convert to CSV
const json2csvParser = new Parser();
const csv = json2csvParser.parse(records);

// Write to CSV file
fs.writeFileSync(outputCSVPath, csv, "utf8");

console.log(`CSV file has been created at ${outputCSVPath}`);
