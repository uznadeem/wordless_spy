class OpenAiWordService
  PROMPT = <<~PROMPT.freeze
    You must output only valid JSON.
    Do not include explanations, comments, formatting outside JSON, or any extra text.

    Task:
    From the following 6 categories, first RANDOMLY SHUFFLE the list internally, then select exactly ONE category from the shuffled list so that each category has an equal probability of being selected. Avoid repeating the same category in consecutive runs whenever possible.

    Categories:
    1. زندگی
    2. پودے اور جانور
    3. شخصیت
    4. کھانے
    5. بے ترتیب
    6. مقامات

    Rules:
    - First, randomly shuffle the list of categories before selecting.
    - Select only ONE category at random each time, with equal chance for all.
    - That category must have exactly 8 Urdu words related to it.
    - Words must be commonly used in everyday life in Pakistan, especially Karachi.
    - All words must be unique and random on every run.
    - Output must be strictly in this format:

    {
      "CATEGORY_NAME": ["word1", "word2", "word3", "word4", "word5", "word6", "word7", "word8"]
    }

    Only output JSON — nothing else.
  PROMPT

  def initialize
    @client = OpenAI::Client.new(
      access_token: Rails.application.credentials.dig(:openai, :api_key),
      log_errors: true
    )
  end

  def fetch_words
    response = @client.chat(
      parameters: {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Only return valid JSON, no extra text." },
          { role: "user", content: PROMPT }
        ],
        max_tokens: 100,
        temperature: 0.8
      }
    )

    JSON.parse(response.dig("choices", 0, "message", "content"))
  end
end
