import { relations } from "drizzle-orm";
import { users } from "./users.js";
import { workspaces } from "./workspaces.js";
import { workspaceMembers } from "./workspace_members.js";
import { boards } from "./boards.js";
import { boardMembers } from "./board_members.js";
import { lists } from "./lists.js";
import { cards } from "./cards.js";
import { comments } from "./comments.js";
import { issues } from "./issues.js";
import { labels } from "./labels.js";
import { cardLabels } from "./card_labels.js";
import { cardAssignees } from "./card_assignees.js";
import { notifications } from "./notifications.js";
import { invitations } from "./invitations.js";
import { passwordResetTokens } from "./password_reset_tokens.js";
import { checklists } from "./checklists.js";
import { checkItems } from "./check_items.js";
import { activityLog } from "./activity_log.js";
import { userPreferences } from "./user_preferences.js";

export const usersRelations = relations(users, ({ one, many }) => ({
  createdWorkspaces: many(workspaces),
  workspaceMemberships: many(workspaceMembers),
  createdBoards: many(boards),
  boardMemberships: many(boardMembers),
  createdCards: many(cards),
  comments: many(comments),
  cardAssignments: many(cardAssignees),
  notifications: many(notifications),
  sentInvitations: many(invitations),
  passwordResetTokens: many(passwordResetTokens),
  preferences: one(userPreferences),
  activity: many(activityLog),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  creator: one(users, { fields: [workspaces.createdBy], references: [users.id] }),
  members: many(workspaceMembers),
  boards: many(boards),
  labels: many(labels),
  invitations: many(invitations),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, { fields: [workspaceMembers.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [workspaceMembers.userId], references: [users.id] }),
}));

export const boardsRelations = relations(boards, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [boards.workspaceId], references: [workspaces.id] }),
  creator: one(users, { fields: [boards.createdBy], references: [users.id] }),
  members: many(boardMembers),
  lists: many(lists),
}));

export const boardMembersRelations = relations(boardMembers, ({ one }) => ({
  board: one(boards, { fields: [boardMembers.boardId], references: [boards.id] }),
  user: one(users, { fields: [boardMembers.userId], references: [users.id] }),
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
  board: one(boards, { fields: [lists.boardId], references: [boards.id] }),
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  list: one(lists, { fields: [cards.listId], references: [lists.id] }),
  creator: one(users, { fields: [cards.createdBy], references: [users.id] }),
  comments: many(comments),
  issues: many(issues),
  assignees: many(cardAssignees),
  cardLabels: many(cardLabels),
  checklists: many(checklists),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  card: one(cards, { fields: [comments.cardId], references: [cards.id] }),
  author: one(users, { fields: [comments.userId], references: [users.id] }),
}));

export const issuesRelations = relations(issues, ({ one }) => ({
  card: one(cards, { fields: [issues.cardId], references: [cards.id] }),
  assignee: one(users, { fields: [issues.assignedTo], references: [users.id] }),
  creator: one(users, { fields: [issues.createdBy], references: [users.id] }),
}));

export const labelsRelations = relations(labels, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [labels.workspaceId], references: [workspaces.id] }),
  cardLabels: many(cardLabels),
}));

export const cardLabelsRelations = relations(cardLabels, ({ one }) => ({
  card: one(cards, { fields: [cardLabels.cardId], references: [cards.id] }),
  label: one(labels, { fields: [cardLabels.labelId], references: [labels.id] }),
}));

export const cardAssigneesRelations = relations(cardAssignees, ({ one }) => ({
  card: one(cards, { fields: [cardAssignees.cardId], references: [cards.id] }),
  user: one(users, { fields: [cardAssignees.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  workspace: one(workspaces, { fields: [invitations.workspaceId], references: [workspaces.id] }),
  inviter: one(users, { fields: [invitations.invitedBy], references: [users.id] }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}));

export const checklistsRelations = relations(checklists, ({ one, many }) => ({
  card: one(cards, { fields: [checklists.cardId], references: [cards.id] }),
  items: many(checkItems),
}));

export const checkItemsRelations = relations(checkItems, ({ one }) => ({
  checklist: one(checklists, { fields: [checkItems.checklistId], references: [checklists.id] }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  actor: one(users, { fields: [activityLog.actorId], references: [users.id] }),
  workspace: one(workspaces, { fields: [activityLog.workspaceId], references: [workspaces.id] }),
  board: one(boards, { fields: [activityLog.boardId], references: [boards.id] }),
  card: one(cards, { fields: [activityLog.cardId], references: [cards.id] }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, { fields: [userPreferences.userId], references: [users.id] }),
}));
