const fs = require("fs");

// Define file paths
const inputFilePath = "./vendorData.json";
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
  // Regular expression to match the last two uppercase letters (state code)
  const match = vendorLocation.match(/\b[A-Z]{2}\b$/);
  return match ? match[0] : null;
}

// Organize vendors by state and category
function organizeVendors(vendors) {
  const organizedData = {};

  vendors.forEach((vendor) => {
    const { vendorLocation, profileCategory, vendorName } = vendor;

    // Extract the state code from the location
    const stateCode = getStateFromLocation(vendorLocation);

    // Skip vendors with missing state code or category
    if (!stateCode || !profileCategory || !vendorName) return;

    // Initialize the state if it doesn't exist
    if (!organizedData[stateCode]) {
      organizedData[stateCode] = {};
    }

    // Initialize the category within the state if it doesn't exist
    if (!organizedData[stateCode][profileCategory]) {
      organizedData[stateCode][profileCategory] = [];
    }

    // Add the vendor to the appropriate state and category
    organizedData[stateCode][profileCategory].push(vendor);
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
