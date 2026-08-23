import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GitLabProvider from "next-auth/providers/gitlab";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

function BitbucketProvider(options: { clientId: string; clientSecret: string }) {
  return {
    id: "bitbucket",
    name: "Bitbucket",
    type: "oauth" as const,
    authorization: { url: "https://bitbucket.org/site/oauth2/authorize", params: { scope: "account repository" } },
    token: "https://bitbucket.org/site/oauth2/access_token",
    userinfo: "https://api.bitbucket.org/2.0/user",
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    profile(profile: any) {
      return {
        id: profile.uuid || profile.account_id,
        name: profile.display_name || profile.username,
        email: profile.email || `${profile.username}@bitbucket.local`,
        image: profile.links?.avatar?.href,
      };
    },
  };
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/signin" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user?.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [GitHubProvider({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET, authorization: { params: { scope: "read:user user:email repo" } } })]
      : []),
    ...(process.env.GITLAB_CLIENT_ID && process.env.GITLAB_CLIENT_SECRET
      ? [GitLabProvider({ clientId: process.env.GITLAB_CLIENT_ID, clientSecret: process.env.GITLAB_CLIENT_SECRET, authorization: { params: { scope: "read_user api write_repository" } } })]
      : []),
    ...(process.env.BITBUCKET_CLIENT_ID && process.env.BITBUCKET_CLIENT_SECRET
      ? [BitbucketProvider({ clientId: process.env.BITBUCKET_CLIENT_ID, clientSecret: process.env.BITBUCKET_CLIENT_SECRET }) as any]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) { token.role = (user as any).role; token.id = user.id; }
      if (account) { token.accessToken = account.access_token; token.provider = account.provider; }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).accessToken = token.accessToken;
        (session.user as any).provider = token.provider;
      }
      return session;
    },
  },
};
