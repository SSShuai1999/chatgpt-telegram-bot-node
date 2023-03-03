import type { BuiltInLanguageModel, CustomLanguageModel } from "./typings";
import { customLanguageModel } from "./constants";

// get openai apikey in `.env`
export function getOpenAPIKEY() {
  return process.env.OPENAI_API_KEY!;
}

// get access token in `.env`
export function getAccessToken() {
  return process.env.ACCESS_TOKEN!;
}

/**
  @description Returns the built-in language model.
*/
export function getBuiltInLM(): BuiltInLanguageModel {
  return process.env.LANGUAGE_MODEL! as BuiltInLanguageModel;
}

/**
  @description Returns the custom language model associated with the given key.
  @param {CustomLanguageModel} key - The key associated with the desired custom language model.
*/
export function getCustomLM(key: CustomLanguageModel): CustomLanguageModel {
  return customLanguageModel[key] as CustomLanguageModel;
}

/**
  @description wait function.
*/
export function sleep(wait: number) {
  return new Promise((r) => {
    setTimeout((_: unknown) => {
      r(void 0);
    }, wait);
  });
}
