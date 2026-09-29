-- Invitations move from workspace-level to board-level (members are assigned per board).
-- Ephemeral rows can't be mapped to boards, so clear them first (fresh demo invites come from invitation_seed.ts).
DELETE FROM "invitations";--> statement-breakpoint
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_workspace_id_workspaces_id_fk";--> statement-breakpoint
ALTER TABLE "invitations" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "board_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint