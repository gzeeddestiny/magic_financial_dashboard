import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google" || !profile?.email) return false;

      const allowed = (process.env.ALLOWED_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      if (allowed.length === 0) return true;
      return allowed.includes(profile.email.toLowerCase());
    },
    async session({ session }) {
      return session;
    },
  },
});

export { handler as GET, handler as POST };
