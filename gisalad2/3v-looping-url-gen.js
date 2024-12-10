const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const categoryLinks = [
    "https://www.gigsalad.com/Actors/Male-Actor-Adult",
    "https://www.gigsalad.com/Actors/Female-Actor-Actress-Adult",
    "https://www.gigsalad.com/Impersonators-Tributes",
    "https://www.gigsalad.com/Actors/Narrator",
    "https://www.gigsalad.com/Actors/Storyteller",
  ];

  const locations = [
    "/AL/Birmingham",
    "/AL/Huntsville",
    "/AL/Montgomery",
    "/AL/Tuscaloosa",
    "/AL/Dothan",
  ];

  const browser = await chromium.launch({ headless: false }); // Launch browser in non-headless mode for debugging
  const page = await browser.newPage();
  const vendorLinks = [];

  for (const category of categoryLinks) {
    for (const location of locations) {
      const url = `${category}${location}`;
      console.log(`Opening page: ${url}`);

      try {
        await page.goto(url);
        console.log("Page loaded successfully.");

        // Wait for the "Show More Results" button to be visible and load more vendors
        while (true) {
          try {
            const loadMoreButton = await page.waitForSelector(
              "#js-show-more-results",
              {
                state: "visible",
                timeout: 5000,
              }
            );
            console.log('Clicking on "Show More Results" button...');
            await loadMoreButton.click();

            console.log("Waiting for more vendors to load...");
            await page.waitForTimeout(2000); // Give some time for new results to load
          } catch {
            // Exit the loop if the button is not found or hidden
            console.log("Button no longer found or is hidden. Stopping...");
            break;
          }
        }

        // Extract vendor links (anchor tags with class "text--default")
        const newLinks = await page.$$eval("a.text--default", (links) =>
          links.map((link) => link.href)
        );
        vendorLinks.push(...newLinks);

        console.log(`Extracted ${newLinks.length} vendors from ${url}.`);
      } catch (err) {
        console.error(`Error loading page ${url}: ${err.message}`);
      }
    }
  }

  // Save vendor links to a JSON file
  const outputFilePath = "./vendorPageLinks.json";
  fs.writeFileSync(
    outputFilePath,
    JSON.stringify(vendorLinks, null, 2),
    "utf-8"
  );
  console.log(`Saved ${vendorLinks.length} vendor links to ${outputFilePath}`);

  // Close the browser
  await browser.close();
})();
