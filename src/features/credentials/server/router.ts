import { PAGINATION } from "@/config/constants";
import { CredentialType } from "@/generated/prisma/enums";
import prisma from "@/lib/db";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { z } from "zod";
import { encrypt } from "@/lib/encryption";

export const credentialsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        value: z.string().min(1, "Value is required"),
        type: z.enum(CredentialType),
      })
    )
    .mutation(({ ctx, input }) => {
      const { name, value, type } = input;

      return prisma.credential.create({
        data: {
          name,
          value: encrypt(value),
          type,
          userId: ctx.auth.user.id,
        },
      });
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      const { id } = input;

      return prisma.credential.delete({
        where: { id, userId: ctx.auth.user.id },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        value: z.string(),
        type: z.enum(CredentialType),
      })
    )
    .mutation(({ ctx, input }) => {
      const { id, name, value, type } = input;

      return prisma.credential.update({
        where: { id, userId: ctx.auth.user.id },
        data: {
          name,
          value: encrypt(value),
          type,
        },
      });
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { id } = input;

      return prisma.credential.findUniqueOrThrow({
        where: { id, userId: ctx.auth.user.id },
        select: {
          id: true,
          name: true,
          type: true,
          value: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }),
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;

      const [items, totalCount] = await Promise.all([
        prisma.credential.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: {
            userId: ctx.auth.user.id,
            name: { contains: search, mode: "insensitive" },
          },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            name: true,
            type: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.credential.count({
          where: {
            userId: ctx.auth.user.id,
            name: { contains: search, mode: "insensitive" },
          },
        }),
      ]);

      const totalPages: number = Math.ceil(totalCount / pageSize);
      const hasNextPage: boolean = page < totalPages;
      const hasPreviousPage: boolean = page > 1;

      return {
        items,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      };
    }),
  getByType: protectedProcedure
    .input(z.object({ type: z.enum(CredentialType) }))
    .query(({ ctx, input }) => {
      const { type } = input;

      return prisma.credential.findMany({
        where: { userId: ctx.auth.user.id, type },
        orderBy: { updatedAt: "desc" },
      });
    }),
});
