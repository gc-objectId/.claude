import { Record, Static, String } from "runtypes";

export const CitationDefinition = Record({
  id: String,
  title: String,
  url: String,
  text: String.nullable(),
});

export type CitationDefinition = Static<typeof CitationDefinition>;
