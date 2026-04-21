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
      // Allow only specific domain or emails
      if (account?.provider === "google" && profile?.email) {
        return true;
      }
      return false;
    },
    async session({ session }) {
      return session;
    },
  },
});

export { handler as GET, handler as POST };
