const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs"); // File system module

(async () => {
  try {
    // * FETCH ALL VENDOR LINKS
    // * FETCH ALL VENDOR LINKS
    // * FETCH ALL VENDOR LINKS
    // * FETCH ALL VENDOR LINKS

    // Send GET request using Axios
    console.log("Fetching the webpage...");
    const response = await axios.get(
      "https://www.theknot.com/marketplace/wedding-reception-venues-dallas-tx?sort=featured"
    );

    // Log status code to ensure request was successful
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

    // * OPEN EACH VENDOR WEBSITE
    // * OPEN EACH VENDOR WEBSITE
    // * OPEN EACH VENDOR WEBSITE
    // * OPEN EACH VENDOR WEBSITE

    // & SAVE TO FILE
    // & SAVE TO FILE
    // & SAVE TO FILE
    // & SAVE TO FILE

    // Check if we found any links
    console.log(`Found ${links.length} links`);

    links = links.map((link) => {
      return `https://www.theknot.com${link}`;
    });

    // Save the links to a file
    const filePath = `${process.cwd()}/links.txt`;
    console.log(`Saving the links to: ${filePath}`);

    fs.writeFile(filePath, links.join("\n"), (err) => {
      if (err) {
        console.error("Error saving the links to file:", err);
      } else {
        console.log("Links successfully saved to links.txt");
      }
    });
  } catch (error) {
    // Handle any errors that occur during the fetching or file writing process
    console.error("Error fetching the page or writing the file:", error);
  }
})();
