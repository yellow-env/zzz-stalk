const { scrapeZZZProfile } = require("./scrape");

const uid = process.argv[2];

if (!uid) {
  console.log(
    JSON.stringify(
      {
        status: false,
        timestamp: new Date().toISOString(),
        error: "Usage: node main.js <uid>",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

scrapeZZZProfile(uid).then((result) => {
  console.log(JSON.stringify(result, null, 2));
  if (!result.status) process.exit(1);
});
