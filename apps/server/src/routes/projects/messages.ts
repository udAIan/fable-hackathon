import type { Request, Response } from "express";
import { asc, eq } from "drizzle-orm";
import { db, studioProjectMessages } from "../../db/client";
import type { ListStudioChatMessagesResponse } from "../../types";

export const listStudioProjectMessages = async (
  req: Request<{ projectId: string }>,
  res: Response<ListStudioChatMessagesResponse>,
) => {
  const { projectId } = req.params;

  const rows = await db
    .select({
      messageId: studioProjectMessages.messageId,
      role: studioProjectMessages.role,
      content: studioProjectMessages.content,
      createdAt: studioProjectMessages.createdAt,
    })
    .from(studioProjectMessages)
    .where(eq(studioProjectMessages.projectId, projectId))
    .orderBy(asc(studioProjectMessages.messageId));

  return res.json(
    rows.map(row => ({
      id: String(row.messageId),
      role: row.role,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    })),
  );
};
