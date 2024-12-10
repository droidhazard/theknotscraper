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

  const vendorFilePath = "./vendorPageLinks.json";
  const checkpointFilePath = "./checkpoint-vedorLinks.json";

  // Ensure vendorPageLinks.json exists
  if (!fs.existsSync(vendorFilePath)) {
    fs.writeFileSync(vendorFilePath, JSON.stringify([]));
  }

  // Load checkpoint or start fresh
  let checkpoint = { categoryIndex: 0, locationIndex: 0 };
  if (fs.existsSync(checkpointFilePath)) {
    console.log("Loading checkpoint...");
    checkpoint = JSON.parse(fs.readFileSync(checkpointFilePath, "utf-8"));
    console.log(`Resuming from checkpoint: ${JSON.stringify(checkpoint)}`);
  } else {
    console.log("No checkpoint found. Starting fresh.");
  }

  const browser = await chromium.launch({ headless: false }); // Launch browser in non-headless mode for debugging
  const page = await browser.newPage();

  try {
    for (let i = checkpoint.categoryIndex; i < categoryLinks.length; i++) {
      for (let j = checkpoint.locationIndex; j < locations.length; j++) {
        const url = `${categoryLinks[i]}${locations[j]}`;
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

          // Append links to the JSON file
          const currentLinks = JSON.parse(
            fs.readFileSync(vendorFilePath, "utf-8")
          );
          const updatedLinks = [...currentLinks, ...newLinks];
          fs.writeFileSync(
            vendorFilePath,
            JSON.stringify(updatedLinks, null, 2),
            "utf-8"
          );

          console.log(
            `Appended ${newLinks.length} vendors from ${url} to file.`
          );
        } catch (err) {
          console.error(`Error loading page ${url}: ${err.message}`);
        }

        // Save the checkpoint after processing each location
        checkpoint = { categoryIndex: i, locationIndex: j + 1 };
        fs.writeFileSync(
          checkpointFilePath,
          JSON.stringify(checkpoint, null, 2)
        );
        console.log(`Checkpoint saved: ${JSON.stringify(checkpoint)}`);
      }

      // Reset locationIndex after finishing all locations for the current category
      checkpoint.locationIndex = 0;
    }
  } catch (error) {
    console.error("An error occurred during scraping:", error.message);
  } finally {
    console.log("Script finished. Checkpoint file retained for future runs.");

    // Close the browser
    await browser.close();
  }
})();
