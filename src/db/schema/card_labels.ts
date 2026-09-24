import { pgTable, serial, integer, uniqueIndex } from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { cards } from "./cards.js";
import { labels } from "./labels.js";

// Junction: hard delete (remove row when unlabelled)
export const cardLabels = pgTable(
  "card_labels",
  {
    id: serial("id").primaryKey(),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    labelId: integer("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  // Unique covers card → labels lookup + blocks duplicates
  (t) => [uniqueIndex("card_labels_card_label_unique").on(t.cardId, t.labelId)]
);

export type CardLabel = InferSelectModel<typeof cardLabels>;
export type NewCardLabel = InferInsertModel<typeof cardLabels>;
