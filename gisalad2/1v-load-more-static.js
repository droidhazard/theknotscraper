const puppeteer = require("puppeteer");

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();

  const url = "https://www.gigsalad.com/Music-Groups/Big-Band/AL/Birmingham";
  console.log(`Navigating to URL: ${url}`);

  // Navigate to the page and wait until the network is idle (meaning all resources are loaded)
  await page.goto(url, { waitUntil: "networkidle2" });
  console.log("Page loaded successfully.");

  // Wait for the "Show More Results" button to be available
  const loadMoreButtonSelector = "button#js-show-more-results";
  await page.waitForSelector(loadMoreButtonSelector, { visible: true });
  console.log(`Waiting for 'Show More Results' button to appear...`);

  const vendorLinks = [];

  let loadMoreButtonVisible = true;
  while (loadMoreButtonVisible) {
    try {
      // Wait for the 'Show More Results' button to become visible
      const buttonVisible = await page.$(loadMoreButtonSelector);
      if (!buttonVisible) {
        console.log("Load more button is not visible, stopping...");
        break;
      }

      console.log('Clicking on "Show More Results" button...');
      await buttonVisible.click(); // Click to load more vendors

      console.log("Waiting for more vendors to load...");
      await page.waitForTimeout(2000); // Wait for 2 seconds after clicking

      console.log("Extracting vendor links...");
      const links = await page.$$eval("a.text--default", (anchors) => {
        return anchors.map((anchor) => anchor.href);
      });
      vendorLinks.push(...links);
      console.log(
        `Found ${links.length} links, total now: ${vendorLinks.length}`
      );

      // Check if the "Show More Results" button contains "hide" class, meaning it's hidden
      loadMoreButtonVisible = await page.$eval(
        loadMoreButtonSelector,
        (button) => !button.classList.contains("hide")
      );

      if (!loadMoreButtonVisible) {
        console.log('The "Show More Results" button is hidden. Stopping...');
        break;
      }
    } catch (error) {
      console.error("Error during scraping:", error);
      break;
    }
  }

  console.log("Extracted vendor links:", vendorLinks);
  console.log(`Total vendor links found: ${vendorLinks.length}`);

  // Close the browser after scraping
  await browser.close();
})();
