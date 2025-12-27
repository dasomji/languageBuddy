LanguageBuddy
LanguageBuddy is a selfstudy language learning application that focuses on learning on content that is relevant for the learning person.

I need your help in developing it.
Our techstack:
- pnpm as package manager
- typescript
- drizzle as ORM
- postgres as database
- zod 4 as validation library
- trpc 11 as api framework
- better-auth 1.4 for authentication
- nextjs 15
- tailwindcss 4
- shadcn as ui library
- react-hook-form 7 as form library
- railway for hosting
- railway storage bucket for storing images and audio (always use presigned urls! when accessing them)
- MinIO storage bucket via docker for local development

For AI-features:
- fal-ai sdk for image generation using the model fal-ai/z-image/turbo
- elevenlabs sdk for audio generation
- openrouter sdk for text generation

I have already installed all the above packages and have an .env with the api-keys for everything that I have described in the .env.example


Application-Flow
1. Prompt user for diary-input
2. Process that diary entry into
    1. A ministory with voice-over
    2. Vocabulary-list with generated images
3. User consumes Mini-stories to engage with new vocabulary.
4. User practices vocabulary in the gym.
5. User engages with words and tracks progress in the VoDex.
6. User can always write new Diary entries to create new relevant content.

Mini-Stories
Mini-Stories are a way of immersing a user in new vocabularies of the language he is learning in small chunks that are easy to remember, using text, image and audio at the same time within a short coherent story based on the users own dictionary entries or his interests.
Mini-Stories are formatted like a children-book. Each page is (depending on the learners learning level) between one sentence to one paragraph of text long. Additionally there is an image that visualizes this sentence within the context of the whole mini-story. Each sentence is also available as audio, generated together with the rest of the content of the mini-story, using a state of the art text-to-speech model from elevenlabs.
We use responsive-font-sizes and responsive layouts to accomodate for differrent screen sizes. The images of a Mini-story are always generated in one consistent style. They are generated with a defined background-color so that the image can be embedded on a webpage allowing for a visually-integrated design with little technical overhead.
The user sees always one „page“ at a time.
The user can swipe left and swipe right to go to the next/last page. We use a transition-animation that resembles turning a real book page.
Going to the next page automatically starts the audio-playback with a delay that can be set in the user-settings. Default is 1 second.
There is a play button inline before the text that allows the user to replay the audio.
The user can click on the any word in the text, which brings up the VoDex-entry of this word.

The last page of the mini-story has information about how often he has read the book and two buttons:
- Read again, which brings the user to the first page.
- Close book, which brings the user back to the main screen.

We track for each mini-story:
- on what page a user is currently in this mini-story
- how often he has read a story completely
- how often he has opened a mini-story
- when that mini-story was last opened

VoDex
The Vodex (short for Vocabulary-Index) is inspired by the PokeDex. It holds information about all vocabularies and grammatical lessons the user has encountered so far.
It is basically an enhanced Dictionary with a focus on learning. Each entry includes:
- the word
- word-kind (we use different background-colors for the word-kind like noun, verb, adjective, etc.)
- sex
- simple example sentence including an audio, generated with tts
- Progress (displayed as xp that a user gathers by practicing and using vocabularies)

In later versions the VoDex also includes:
- List of similar words already stored in the VoDex
- Training-Button that allows the user to practice that specific word

Gym
In the gym, we work out, building our memory muscles 💪
Basically, we are doing a more sophisticated kind of spaced repitition.
We use spaced repitition algorithms to display the vocabularies from the VoDex, but instead of simple flashcards, we use different practice methods. In the MVP, the user has to self-evaluate whether he was correct, did a little mistake or didn’t know the answer.

The different practices are:
- Foreign word recognition: Foreign word/sentence is displayed, English word has to be written
- English Prompt: Foreign word/sentence has to be written
- Combination: An llm is given two to six (depends on learners level) vocabs from the VoDex and forms a sentence with them. The user then has to translate them.
- Transformer-Drills: The user is given a sentence and a clue how to transform the sentence. E.g. {„I am a boy“, clue: „we“} —> „We are boys“.
- Conversation: Conversation with an LLM with only the vocabs so far available in the VoDex.
- Freeflow: User writes or dictates freely. Either freely or with a prompt/topic given. Users can substitute words they don’t know with words in their mother tongue. —> Feedback is provided on the text by an llm.

Daily Diary
The user is asked to write a diary entry every day. The user is allowed to write this in the beginning in his mother tongue. He then transitions to using a mix of the target language as much as he knows and only substitutes with the mother tongue. This way, he builds proficiency and practices daily, expands his vocabulary without being held back by what he doesn’t yet.

Example Diary-entry:
This weekend, I was in Leipzig. Frederick had his birthday and friends from all over Germany and Austria came to celebrate with him.
I only arrived in the evening, because I needed to clean up my flat since I won’t be in Berlin for the next six weeks.
Friday night was super fun! We had wonderful conversations, played Boombusters, a boardgame where we had to cooperatively defuse a bomb. We made it to Level 14!
We called ourselves Team Cobra and had the motto „Cobra bites!“ and we made ssss-sounds like a snake whenever we were succesfull.
We also formed little monsters out of clay and then organised them late night into an evolutionary hierarchy, which was so much fun!
I created an eye-monster and a snake!
On Saturday we played Boombusters as a different group and called ourselves Team Powerrangers and after winning a level we did this fist-bump in a circle with crossed-over-arms.
We also went for walks and to a cafe and had fish for dinner. Oh, and we went to this medieval Christmas market, where I nearly bought a fur that you could wear on your shoulders!

Prompts
Translation prompt:
I want to learn french with my own diary. I’ll give you a diary entry and you translate it to French. Simplify the sentence structure for a complete beginner. Output only the translation, nothing else!

Ministory prompt:
I want to turn the following into a childrenbook-like story.
We need to break this down into blocks, where each block is made up of max 2 sentences so that it fits well on one page of a children book.
Each block also has an image that visualizes what’s happening. Create an image prompt for each block. Important: The image needs a white background so that the image can be embedded well into a website. Also take the context of the whole story into account when creating the image-prompts so that we have consistency in the images.
Please provide a structured json-output with :
[
{
„text_target_language“:“{text-output}“,
„text_native_language“:“{text-output-in-native-language}“,
„page“: {page-number}
„image_prompt“:“<image prompt>“
},
2:{
„text“:“{text-output}“,
„image-prompt“:“<image prompt>“
},
3:{
„text“:“{text-output}“,
„image-prompt“:“<image prompt>“
}
]

Extract vocabs prompt:
I am learning a language by using my own dictionary entries as the content of what I’m learning. I’m learning {target language} I provide you with an already translated text. Please extract the vocabularies from this text and return them as structured json-output. We need for each vocab:
- vocabulary
- translation in native language
- Lemma of the word
- simple example sentence based on my dictionary entry. This should be a stripped down, short sentence with the main focus on this one vocabulary.
- sex (masculine, feminine, etc. - if this word doesnt have a sex, return none)
- image-prompt that can be used for image generation with {image-model}. We use mnemonic cues in our images. Masculine words are fire-themed, feminine-words are ice-themed. The image needs a background in {color-code} so that the image can be embedded well into a website.
- kind of vocabulary (noun, verb, adjective, etc.)


Besides the extracted words, we need word packs of 10 words each, which could be relevant for me based on what I’m describing in my dictionary entry. Create {number-of-new-vocabulary-packs-per-entry} additional vocabulary-packs. No overlap in vocabularies between the word-packs!

structure:
{
vocab, example-sentence, word-kind , sex
}

The returned json should be compared against our database of vocabularies. If the word is already in the database, we don't save it to the database. In order to make sure that we don't get duplicates due to different word-forms, we use the Lemma of the word for comparison. We might need to update our database schema.

Ideas for Levels:
- an absolute beginner in {target language}. 
- {target language} level A1.
- {target language} level A2