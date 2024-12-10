const { chromium } = require("playwright");

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

  // Open the initial page
  const url = "https://www.gigsalad.com/Music-Groups/Big-Band/AL/Birmingham";
  console.log(`Opening page: ${url}`);
  await page.goto(url);

  // Wait for the "Show More Results" button to be visible
  console.log('Waiting for "Show More Results" button to appear...');
  let loadMoreButton;

  const vendorLinks = [];

  // Loop to click the "Show More Results" button until it's no longer available
  while (true) {
    try {
      // Wait for the button to appear
      loadMoreButton = await page.waitForSelector("#js-show-more-results", {
        state: "visible",
        timeout: 5000,
      });
      console.log('Clicking on "Show More Results" button...');

      // Click on the "Load More" button
      await loadMoreButton.click();

      // Wait for more vendors to load
      console.log("Waiting for more vendors to load...");
      await page.waitForTimeout(2000); // Give some time for new results to load

      // Extract vendor links (anchor tags with class "text--default")
      const newLinks = await page.$$eval("a.text--default", (links) =>
        links.map((link) => link.href)
      );
      vendorLinks.push(...newLinks);

      console.log(`Loaded ${newLinks.length} more vendors.`);
    } catch (err) {
      // If button is not found or it's hidden, stop the loop
      console.log("Button no longer found or is hidden. Stopping...");
      break;
    }
  }

  // Print all extracted vendor links
  console.log(`Extracted a total of ${vendorLinks.length} vendor links:`);
  console.log(vendorLinks);

  // Close the browser
  await browser.close();
})();
