const fs = require("fs");

// Define file paths
const inputFilePath = "./vendorDataWithLinksAndEmails.json";
const outputFilePath = "./sortedVendors.json";

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

// Extract state code from the vendor location
function getStateFromLocation(vendorLocation) {
  const match = vendorLocation.match(/\b[A-Z]{2}\b$/);
  return match ? match[0] : null;
}

// Extract city from the vendor location
function getCityFromLocation(vendorLocation) {
  const stateCode = getStateFromLocation(vendorLocation);
  if (!stateCode) return null;

  const city = vendorLocation.split(`, ${stateCode}`)[0].trim();
  return city || null;
}

// Organize vendors by state, city, and categories
function organizeVendors(vendors) {
  const organizedData = {};

  vendors.forEach((vendor) => {
    const {
      vendorLocation,
      topLevelCategory,
      subCategory,
      thirdLevelCategory,
    } = vendor;
    const stateCode = getStateFromLocation(vendorLocation);
    const city = getCityFromLocation(vendorLocation);

    // Skip vendors with missing state code, city, or categories
    if (
      !stateCode ||
      !city ||
      !topLevelCategory ||
      !subCategory ||
      !thirdLevelCategory
    )
      return;

    // Initialize the state if it doesn't exist
    if (!organizedData[stateCode]) {
      organizedData[stateCode] = {};
    }

    // Initialize the city within the state if it doesn't exist
    if (!organizedData[stateCode][city]) {
      organizedData[stateCode][city] = {};
    }

    // Initialize the topLevelCategory within the city if it doesn't exist
    if (!organizedData[stateCode][city][topLevelCategory]) {
      organizedData[stateCode][city][topLevelCategory] = {};
    }

    // Initialize the subCategory within the topLevelCategory if it doesn't exist
    if (!organizedData[stateCode][city][topLevelCategory][subCategory]) {
      organizedData[stateCode][city][topLevelCategory][subCategory] = {};
    }

    // Initialize the thirdLevelCategory within the subCategory if it doesn't exist
    if (
      !organizedData[stateCode][city][topLevelCategory][subCategory][
        thirdLevelCategory
      ]
    ) {
      organizedData[stateCode][city][topLevelCategory][subCategory][
        thirdLevelCategory
      ] = [];
    }

    // Add the vendor to the appropriate state, city, and category levels
    organizedData[stateCode][city][topLevelCategory][subCategory][
      thirdLevelCategory
    ].push(vendor);
  });

  return organizedData;
}

// Write the sorted data to a JSON file
function writeSortedData(sortedData) {
  try {
    fs.writeFileSync(outputFilePath, JSON.stringify(sortedData, null, 2));
    console.log("Sorted data saved to sortedVendors.json");
  } catch (error) {
    console.error("Error writing sorted data:", error);
  }
}

// Main function to sort vendors
function sortVendors() {
  const vendors = readVendorData();
  const sortedData = organizeVendors(vendors);
  writeSortedData(sortedData);
}

// Run the sorter function
sortVendors();
