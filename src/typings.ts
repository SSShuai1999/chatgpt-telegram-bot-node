import { customLanguageModel } from "./constants";

// built-in language model
export type BuiltInLanguageModel =
  | "gpt-3.5-turbo"
  | "gpt-3.5-turbo-0301"
  | "text-davinci-001"
  | "text-davinci-002"
  | "text-davinci-003"
  | "text-curie-001"
  | "text-babbage-001"
  | "text-ada-001";

// models you create yourself
export type CustomLanguageModel = keyof typeof customLanguageModel;
