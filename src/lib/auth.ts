import { Auth, betterAuth, BetterAuthOptions } from "better-auth";
import { polar, checkout, portal } from "@polar-sh/better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./db";
import { polarClient } from "./polar";

export const auth: Auth<BetterAuthOptions> = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId: "14c4f7d0-12ee-4718-abcb-a3e50537ed12",
              slug: "pro",
            },
          ],
          successUrl: process.env.POLAR_SUCCESS_URL,
          authenticatedUsersOnly: true,
        }),
        portal(),
      ],
    }),
  ],
});
