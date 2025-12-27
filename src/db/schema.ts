import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const diaryEntries = pgTable("diary_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  learningSpaceId: uuid("learning_space_id").references(
    () => learningSpaces.id,
    { onDelete: "cascade" },
  ),
  rawText: text("raw_text").notNull(),
  targetLanguage: text("target_language").notNull(),
  level: text("level").notNull(), // beginner, A1, A2
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const miniStories = pgTable("mini_stories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  learningSpaceId: uuid("learning_space_id").references(
    () => learningSpaces.id,
    { onDelete: "cascade" },
  ),
  diaryEntryId: uuid("diary_entry_id").references(() => diaryEntries.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  fullTextTarget: text("full_text_target").notNull(),
  fullTextNative: text("full_text_native").notNull(),
  coverImageKey: text("cover_image_key"),
  languageLevel: text("language_level").notNull(),
  originalDiaryText: text("original_diary_text"),
  fullTranslation: text("full_translation"),
  readCount: integer("read_count").notNull().default(0),
  openCount: integer("open_count").notNull().default(0),
  lastOpenedAt: timestamp("last_opened_at"),
  currentPage: integer("current_page").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const miniStoryPages = pgTable("mini_story_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  miniStoryId: uuid("mini_story_id")
    .notNull()
    .references(() => miniStories.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  textTarget: text("text_target").notNull(),
  textNative: text("text_native").notNull(),
  imageKey: text("image_key"),
  audioKey: text("audio_key"),
});

export const vocabularies = pgTable("vocabularies", {
  id: uuid("id").primaryKey().defaultRandom(),
  learningSpaceId: uuid("learning_space_id").references(
    () => learningSpaces.id,
    { onDelete: "cascade" },
  ),
  word: text("word").notNull(),
  lemma: text("lemma").notNull(),
  translation: text("translation").notNull(),
  definition: text("definition"),
  wordKind: text("word_kind").notNull(), // noun, verb, adjective, etc.
  sex: text("sex"), // masculine, feminine, none
  exampleSentence: text("example_sentence"),
  exampleSentenceTranslation: text("example_sentence_translation"),
  exampleAudioKey: text("example_audio_key"),
  imageKey: text("image_key"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const userVocabProgress = pgTable(
  "user_vocab_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    learningSpaceId: uuid("learning_space_id").references(
      () => learningSpaces.id,
      { onDelete: "cascade" },
    ),
    vocabId: uuid("vocab_id")
      .notNull()
      .references(() => vocabularies.id, { onDelete: "cascade" }),
    xp: integer("xp").notNull().default(0),
    srsLevel: integer("srs_level").notNull().default(0),
    nextReviewAt: timestamp("next_review_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.userId, table.learningSpaceId, table.vocabId],
    }),
  }),
);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  audioPlaybackDelay: integer("audio_playback_delay").notNull().default(1000), // in ms, default 1s
  imageStyle: text("image_style")
    .notNull()
    .default("children book watercolors"),
  activeLearningSpaceId: uuid("active_learning_space_id").references(
    () => learningSpaces.id,
    { onDelete: "set null" },
  ),
});

export const learningSpaces = pgTable("learning_spaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetLanguage: text("target_language").notNull(),
  nativeLanguage: text("native_language").notNull(),
  level: text("level").notNull(), // beginner, A1, A2, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
