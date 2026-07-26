export async function createFinishedResult({ generatePrompt, runPrompt }) {
  const prompt = await generatePrompt();
  if (!prompt) return null;

  const output = await runPrompt(prompt);
  if (!output) return { prompt, output: "" };

  return { prompt, output };
}
