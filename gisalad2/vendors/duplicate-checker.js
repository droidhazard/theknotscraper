const fs = require("fs");

// Function to find duplicates in an array of strings
function findDuplicates(array) {
  const duplicates = [];
  const seen = new Map();

  array.forEach((item) => {
    if (seen.has(item)) {
      if (seen.get(item) === 1) {
        duplicates.push(item);
      }
      seen.set(item, seen.get(item) + 1);
    } else {
      seen.set(item, 1);
    }
  });

  return duplicates;
}

// Main script
try {
  // Read the input array from array.json
  const inputFilePath = "array.json";
  const outputFilePath = "filtered-array.json";

  const data = fs.readFileSync(inputFilePath, "utf-8");
  const stringArray = JSON.parse(data);

  if (!Array.isArray(stringArray)) {
    throw new Error("Input file does not contain a valid array.");
  }

  // Find duplicates
  const duplicateStrings = findDuplicates(stringArray);

  // Save duplicates to filtered-array.json
  fs.writeFileSync(outputFilePath, JSON.stringify(duplicateStrings, null, 2));

  console.log(`Duplicate strings saved to ${outputFilePath}`);
} catch (error) {
  console.error("Error:", error.message);
}
