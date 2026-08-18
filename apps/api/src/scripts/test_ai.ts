import { generatePollContent } from "../modules/ai/ai.service";

(async () => {
  try {
    console.log("Running generatePollContent test...");
    const res = await generatePollContent("Is remote work here to stay?", "news");
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("Error running test:", err);
    process.exit(1);
  }
})();
